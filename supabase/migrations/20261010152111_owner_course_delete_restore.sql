-- Only the two already configured, verified editors become course-content owners.
-- Bind ownership to auth user IDs; future editors and user-editable JWT metadata
-- cannot acquire deletion privileges. Owner identities stay in the private schema.
create table private.content_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table private.content_owners enable row level security;
revoke all on private.content_owners from public, anon, authenticated;

insert into private.content_owners(user_id)
select u.id from auth.users u
join private.editor_users e on lower(e.email)=lower(u.email)
where e.enabled and u.email_confirmed_at is not null;
do $$ begin
  if (select count(*) from private.content_owners)<>2 then
    raise exception 'Expected exactly two existing verified course-content owners';
  end if;
end $$;

create function private.is_content_owner()
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null
    and private.is_allowed_user() and private.is_editor()
    and exists(select 1 from private.content_owners o where o.user_id=auth.uid() and o.enabled)
    and exists(
      select 1 from auth.sessions s
      where s.user_id=auth.uid()
        and s.id=case when (auth.jwt()->>'session_id') ~ '^[0-9a-fA-F-]{36}$'
          then (auth.jwt()->>'session_id')::uuid else null end
        and (s.not_after is null or s.not_after>now())
    );
$$;
revoke all on function private.is_content_owner() from public, anon;
grant execute on function private.is_content_owner() to authenticated;

create function public.get_my_content_access()
returns jsonb language sql stable security invoker set search_path=''
as $$ select jsonb_build_object('content_owner',private.is_content_owner()); $$;
revoke all on function public.get_my_content_access() from public, anon;
grant execute on function public.get_my_content_access() to authenticated;

alter table public.subjects
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null,
  add column previous_is_active boolean,
  add constraint subjects_deleted_inactive check(deleted_at is null or not is_active);
alter table public.chapters
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null,
  add column previous_is_active boolean,
  add constraint chapters_deleted_inactive check(deleted_at is null or not is_active);
alter table public.exercises
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null,
  add column previous_is_active boolean,
  add constraint exercises_deleted_inactive check(deleted_at is null or not is_active);

-- Protect direct PATCH/INSERT/DELETE as well as the UI's RPC. Maintenance roles
-- may repair data; a browser request always runs as authenticated, never postgres.
create function private.guard_course_deletion()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare v_changed boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then
    if not private.is_content_owner() then
      raise exception using errcode='42501',message='Chỉ hai admin chủ có quyền xoá nội dung.';
    end if;
    return old;
  end if;
  if tg_op='INSERT' then
    v_changed:=new.deleted_at is not null or new.deleted_by is not null or new.previous_is_active is not null;
  else
    v_changed:=old.deleted_at is not null or
      row(new.deleted_at,new.deleted_by,new.previous_is_active) is distinct from
      row(old.deleted_at,old.deleted_by,old.previous_is_active);
  end if;
  if v_changed and not private.is_content_owner() then
    raise exception using errcode='42501',message='Chỉ hai admin chủ có quyền xoá và khôi phục mục.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_course_deletion() from public, anon, authenticated;
create trigger guard_subject_deletion before insert or update or delete on public.subjects
  for each row execute function private.guard_course_deletion();
create trigger guard_chapter_deletion before insert or update or delete on public.chapters
  for each row execute function private.guard_course_deletion();
create trigger guard_exercise_deletion before insert or update or delete on public.exercises
  for each row execute function private.guard_course_deletion();

-- Existing question/lesson DELETE policies allow editors. Restrict physical
-- deletion to content owners too; course nodes use recoverable deletion only.
create policy content_owner_delete_questions on public.questions as restrictive
  for delete to authenticated using((select private.is_content_owner()));
create policy content_owner_delete_lessons on public.lessons as restrictive
  for delete to authenticated using((select private.is_content_owner()));

create function public.set_course_item_deleted(
  p_kind text,p_id text,p_deleted boolean,p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_table text; v_item jsonb; v_result jsonb;
begin
  if not private.is_content_owner() then
    raise exception using errcode='42501',message='Chỉ hai admin chủ có quyền xoá và khôi phục mục.';
  end if;
  v_table:=case p_kind when 'subject' then 'subjects' when 'chapter' then 'chapters'
    when 'exercise' then 'exercises' else null end;
  if v_table is null or p_id is null or p_deleted is null then
    raise exception using errcode='22023',message='Loại mục hoặc thao tác không hợp lệ.';
  end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_table)
    into v_item using p_id;
  if v_item is null then
    raise exception using errcode='P0002',message='Mục không còn tồn tại. Hãy tải lại danh sách.';
  end if;
  if (v_item->>'deleted_at' is not null)=p_deleted then return v_item; end if;
  if p_expected_updated_at is null or
    (v_item->>'updated_at')::timestamptz is distinct from p_expected_updated_at then
    raise exception using errcode='40001',message='Mục vừa thay đổi. Hãy tải lại trước khi xoá hoặc khôi phục.';
  end if;
  if not p_deleted then
    if p_kind='chapter' and not exists(
      select 1 from public.subjects s where s.id=v_item->>'subject_id' and s.deleted_at is null
    ) then
      raise exception using errcode='23503',message='Khôi phục môn học cha trước.';
    end if;
    if p_kind='exercise' and not exists(
      select 1 from public.chapters c join public.subjects s on s.id=c.subject_id
      where c.id=v_item->>'chapter_id' and c.deleted_at is null and s.deleted_at is null
    ) then
      raise exception using errcode='23503',message='Khôi phục môn học và chương cha trước.';
    end if;
  end if;
  execute format('update public.%I as t set
    previous_is_active=case when $2 then is_active else null end,
    is_active=case when $2 then false else coalesce(previous_is_active,true) end,
    deleted_at=case when $2 then clock_timestamp() else null end,
    deleted_by=case when $2 then auth.uid() else null end
    where id=$1 returning to_jsonb(t)',v_table)
    into v_result using p_id,p_deleted;
  return v_result;
end;
$$;
revoke all on function public.set_course_item_deleted(text,text,boolean,timestamptz) from public, anon;
grant execute on function public.set_course_item_deleted(text,text,boolean,timestamptz) to authenticated;

-- Serialize identical creations, including requests from different devices.
-- Existing duplicates stay readable until the owner removes the unwanted node.
create function private.guard_course_duplicate()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare v_title text; v_parent text; v_clause text:=''; v_exists boolean;
begin
  v_title:=lower(regexp_replace(btrim(new.title),'[[:space:]]+',' ','g'));
  if tg_table_name='chapters' then
    v_parent:=to_jsonb(new)->>'subject_id';v_clause:=' and subject_id=$2';
  elsif tg_table_name='exercises' then
    v_parent:=to_jsonb(new)->>'chapter_id';v_clause:=' and chapter_id=$2';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name||':'||coalesce(v_parent,'')||':'||v_title,0));
  execute format('select exists(select 1 from public.%I where deleted_at is null
    and lower(regexp_replace(btrim(title),''[[:space:]]+'','' '',''g''))=$1%s)',tg_table_name,v_clause)
    into v_exists using v_title,v_parent;
  if v_exists then
    raise exception using errcode='23505',message='Tên đã tồn tại trong mục cha này. Hãy chọn mục có sẵn.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_course_duplicate() from public, anon, authenticated;
create trigger guard_subject_duplicate before insert on public.subjects
  for each row execute function private.guard_course_duplicate();
create trigger guard_chapter_duplicate before insert on public.chapters
  for each row execute function private.guard_course_duplicate();
create trigger guard_exercise_duplicate before insert on public.exercises
  for each row execute function private.guard_course_duplicate();

comment on function public.set_course_item_deleted(text,text,boolean,timestamptz) is
  'Owner-only reversible course deletion. Preserves descendants, sources, progress, attempts and audit history.';
notify pgrst,'reload schema';
