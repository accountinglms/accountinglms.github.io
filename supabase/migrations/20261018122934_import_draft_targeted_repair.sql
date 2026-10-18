-- All operations use the caller's existing editor + MFA context and RLS.
create table public.import_repair_runs (
  id uuid primary key,
  draft_id uuid not null references public.import_drafts(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  mode text not null check (mode in ('auto','manual','save','apply')),
  state text not null check (state in ('running','ready','failed','conflict','undone')),
  base_payload jsonb not null,
  after_payload jsonb,
  applied jsonb not null default '[]',
  suggestions jsonb not null default '[]',
  issues jsonb not null default '[]',
  error jsonb,
  created_at timestamptz not null default now(),
  lease_expires_at timestamptz not null default (now()+interval '110 seconds'),
  finished_at timestamptz
);
create unique index import_repair_one_active on public.import_repair_runs(draft_id) where state='running';
create unique index import_repair_one_auto on public.import_repair_runs(draft_id) where mode='auto';
create index import_repair_owner_time on public.import_repair_runs(created_by,created_at desc);
create index import_repair_draft_time on public.import_repair_runs(draft_id,created_at desc);
alter table public.import_repair_runs enable row level security;
revoke all on public.import_repair_runs from public,anon;
grant select,insert,update on public.import_repair_runs to authenticated;
create policy editor_own_repair on public.import_repair_runs for all to authenticated
using (created_by=(select auth.uid()) and (select private.is_editor())
  and exists(select 1 from public.import_drafts d where d.id=draft_id and d.created_by=(select auth.uid())))
with check (created_by=(select auth.uid()) and (select private.is_editor())
  and exists(select 1 from public.import_drafts d where d.id=draft_id and d.created_by=(select auth.uid())));

create function public.begin_import_repair(p_draft_id uuid,p_request_id uuid,p_expected_updated_at timestamptz,p_mode text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare d public.import_drafts; r public.import_repair_runs;
begin
  if auth.uid() is null or not private.is_editor() then raise exception 'FORBIDDEN'; end if;
  if p_mode not in ('auto','manual') or p_request_id is null then raise exception 'INVALID_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into d from public.import_drafts where id=p_draft_id and created_by=auth.uid() for update;
  if not found or d.status<>'draft' then raise exception 'DRAFT_NOT_EDITABLE'; end if;
  select * into r from public.import_repair_runs where id=p_request_id and draft_id=d.id;
  if found then return jsonb_build_object('state',r.state,'run_id',r.id); end if;
  update public.import_repair_runs set state='failed',finished_at=now(),error='{"code":"REPAIR_INTERRUPTED","error":"Lượt sửa bị gián đoạn. Bản nháp được giữ nguyên; bạn có thể thử lại."}'
    where created_by=auth.uid() and state='running' and lease_expires_at<=now();
  select * into r from public.import_repair_runs where draft_id=d.id and state='running';
  if found then return jsonb_build_object('state','running','run_id',r.id); end if;
  if p_mode='auto' then
    select * into r from public.import_repair_runs where draft_id=d.id and mode='auto';
    if found then return jsonb_build_object('state',r.state,'run_id',r.id,'already_attempted',true); end if;
  end if;
  if p_expected_updated_at is null or d.updated_at<>p_expected_updated_at then return jsonb_build_object('state','changed','code','DRAFT_CHANGED'); end if;
  if exists(select 1 from public.import_repair_runs where created_by=auth.uid() and state='running') then return jsonb_build_object('state','busy','code','REPAIR_BUSY'); end if;
  if exists(select 1 from public.import_repair_runs where created_by=auth.uid() and mode in ('auto','manual') and created_at>now()-interval '15 seconds') then
    return jsonb_build_object('state','cooldown','code','REPAIR_COOLDOWN','retry_after_seconds',15);
  end if;
  if (select count(*) from public.import_repair_runs where created_by=auth.uid() and mode in ('auto','manual') and created_at>now()-interval '24 hours')>=30 then
    return jsonb_build_object('state','limited','code','REPAIR_DAILY_LIMIT');
  end if;
  insert into public.import_repair_runs(id,draft_id,created_by,mode,state,base_payload)
    values(p_request_id,d.id,auth.uid(),p_mode,'running',d.payload) returning * into r;
  return jsonb_build_object('state','claimed','run_id',r.id,'draft',to_jsonb(d));
end;
$$;

create function public.finish_import_repair(p_run_id uuid,p_result jsonb default null,p_error jsonb default null)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare r public.import_repair_runs; d public.import_drafts; n jsonb; b jsonb; a jsonb; i integer;
begin
  if auth.uid() is null or not private.is_editor() then raise exception 'FORBIDDEN'; end if;
  -- Always lock draft then run, the same order as claim and undo.
  select * into r from public.import_repair_runs where id=p_run_id and created_by=auth.uid();
  if not found then raise exception 'REPAIR_NOT_FOUND'; end if;
  select * into d from public.import_drafts where id=r.draft_id and created_by=auth.uid() for update;
  select * into r from public.import_repair_runs where id=p_run_id for update;
  if r.state<>'running' then return jsonb_build_object('state',r.state,'run_id',r.id); end if;
  if p_error is not null then
    update public.import_repair_runs set state='failed',error=p_error,finished_at=now() where id=r.id;
    return jsonb_build_object('state','failed','run_id',r.id);
  end if;
  n=p_result->'payload';
  if jsonb_typeof(n) is distinct from 'object' or jsonb_typeof(n->'questions')<>'array'
    or (n-array['questions','warnings']) is distinct from (r.base_payload-array['questions','warnings'])
    or jsonb_array_length(n->'questions')<>jsonb_array_length(r.base_payload->'questions') then raise exception 'REPAIR_CHANGED_SOURCE'; end if;
  if jsonb_array_length(n->'questions')>0 then
    for i in 0..jsonb_array_length(n->'questions')-1 loop
      b=r.base_payload->'questions'->i; a=n->'questions'->i;
      if (b-array['practical_example_en','practical_example_vi','review_note']) is distinct from (a-array['practical_example_en','practical_example_vi','review_note']) then raise exception 'REPAIR_CHANGED_SOURCE'; end if;
    end loop;
  end if;
  update public.import_repair_runs set after_payload=n,applied=coalesce(p_result->'applied','[]'),suggestions=coalesce(p_result->'suggestions','[]'),issues=coalesce(p_result->'issues','[]'),finished_at=now(),
    state=case when d.status='draft' and d.payload=r.base_payload and r.lease_expires_at>now() then 'ready' else 'conflict' end where id=r.id returning * into r;
  if r.state='ready' then
    update public.import_drafts set payload=n,updated_by=auth.uid() where id=d.id returning * into d;
  end if;
  return jsonb_build_object('state',r.state,'run_id',r.id);
end;
$$;

create function public.save_import_revision(p_draft_id uuid,p_expected_updated_at timestamptz,p_payload jsonb,p_action text default 'save')
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare d public.import_drafts;
begin
  if auth.uid() is null or not private.is_editor() then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('save','apply') or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8388608 then raise exception 'INVALID_INPUT'; end if;
  select * into d from public.import_drafts where id=p_draft_id and created_by=auth.uid() for update;
  if not found or d.status<>'draft' then raise exception 'DRAFT_NOT_EDITABLE'; end if;
  if p_expected_updated_at is null or d.updated_at<>p_expected_updated_at then raise exception 'DRAFT_CHANGED'; end if;
  if exists(select 1 from public.import_repair_runs where draft_id=d.id and state='running' and lease_expires_at>now()) then raise exception 'REPAIR_BUSY'; end if;
  if (d.payload->'files') is distinct from (p_payload->'files') or (d.payload->'destination') is distinct from (p_payload->'destination') then raise exception 'REPAIR_CHANGED_SOURCE'; end if;
  if d.payload<>p_payload then
    insert into public.import_repair_runs(id,draft_id,created_by,mode,state,base_payload,after_payload,finished_at)
      values(gen_random_uuid(),d.id,auth.uid(),p_action,'ready',d.payload,p_payload,now());
    update public.import_drafts set payload=p_payload,updated_by=auth.uid() where id=d.id returning * into d;
  end if;
  return to_jsonb(d);
end;
$$;

create function public.undo_import_repair(p_run_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare r public.import_repair_runs; d public.import_drafts;
begin
  if auth.uid() is null or not private.is_editor() then raise exception 'FORBIDDEN'; end if;
  select * into r from public.import_repair_runs where id=p_run_id and created_by=auth.uid();
  if not found then raise exception 'REPAIR_NOT_FOUND'; end if;
  select * into d from public.import_drafts where id=r.draft_id and created_by=auth.uid() for update;
  select * into r from public.import_repair_runs where id=p_run_id for update;
  if d.status<>'draft' or r.state<>'ready' or p_expected_updated_at is null or d.updated_at<>p_expected_updated_at or d.payload is distinct from r.after_payload then raise exception 'DRAFT_CHANGED'; end if;
  if exists(select 1 from public.import_repair_runs where draft_id=d.id and state='running' and lease_expires_at>now()) then raise exception 'REPAIR_BUSY'; end if;
  update public.import_drafts set payload=r.base_payload,updated_by=auth.uid() where id=d.id returning * into d;
  update public.import_repair_runs set state='undone' where id=r.id;
  return to_jsonb(d);
end;
$$;

revoke all on function public.begin_import_repair(uuid,uuid,timestamptz,text),public.finish_import_repair(uuid,jsonb,jsonb),public.save_import_revision(uuid,timestamptz,jsonb,text),public.undo_import_repair(uuid,timestamptz) from public,anon;
grant execute on function public.begin_import_repair(uuid,uuid,timestamptz,text),public.finish_import_repair(uuid,jsonb,jsonb),public.save_import_revision(uuid,timestamptz,jsonb,text),public.undo_import_repair(uuid,timestamptz) to authenticated;
