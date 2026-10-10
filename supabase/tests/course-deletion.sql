-- Run through an administrative SQL connection. Everything, including audit
-- events and the temporary loss of one owner's permission, is rolled back.
begin;
create temporary table course_delete_test_context(context jsonb) on commit drop;
grant select on course_delete_test_context to authenticated, anon;
do $$
declare sid text:='test_subject_'||gen_random_uuid(); cid text:='test_chapter_'||gen_random_uuid();
  eid text:='test_exercise_'||gen_random_uuid(); owners jsonb;
begin
  select jsonb_agg(jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated','aal','aal2','session_id',s.id))
  into owners from private.content_owners o join auth.users u on u.id=o.user_id
  join lateral(select id from auth.sessions where user_id=u.id and (not_after is null or not_after>now()) order by created_at desc limit 1) s on true
  where o.enabled;
  if jsonb_array_length(owners)<>2 then raise exception 'Both owners require an existing session for this test'; end if;
  insert into public.subjects(id,title,is_active) values(sid,sid,true);
  insert into public.chapters(id,subject_id,title,is_active) values(cid,sid,'Deletion fixture',true);
  insert into public.exercises(id,chapter_id,title,is_active) values(eid,cid,'Deletion fixture',true);
  insert into public.questions(exercise_id,question_type,prompt,options,correct_answer,required_selections,status,sort_order)
    values(eid,'single','Deletion fixture question','["A","B"]'::jsonb,'0'::jsonb,1,'draft',0);
  insert into public.lessons(chapter_id,title,content_markdown,status) values(cid,'Deletion fixture lesson','Fixture body','draft');
  insert into course_delete_test_context values(jsonb_build_object('sid',sid,'cid',cid,'eid',eid,'owners',owners,
    'counts',jsonb_build_array((select count(*) from public.questions),(select count(*) from public.lessons),
      (select count(*) from public.user_progress),(select count(*) from public.exercise_attempts))));
end $$;
set local role authenticated;
do $$
declare ctx jsonb; claims jsonb; item jsonb; timestamp_before timestamptz; denied boolean;
begin
  select context into ctx from pg_temp.course_delete_test_context;
  for claims in select value from jsonb_array_elements(ctx->'owners') loop
    perform set_config('request.jwt.claims',claims::text,true);
    if (public.get_my_content_access()->>'content_owner')::boolean is not true then
      raise exception 'A configured owner was denied';
    end if;
  end loop;
  claims:=ctx->'owners'->0;
  perform set_config('request.jwt.claims',(claims||jsonb_build_object('sub',gen_random_uuid(),'user_metadata',jsonb_build_object('role','owner')))::text,true);
  if (public.get_my_content_access()->>'content_owner')::boolean then raise exception 'Spoofed metadata/email granted ownership'; end if;
  perform set_config('request.jwt.claims',(claims||jsonb_build_object('session_id',gen_random_uuid()))::text,true);
  if (public.get_my_content_access()->>'content_owner')::boolean then raise exception 'Revoked session granted ownership'; end if;
  perform set_config('request.jwt.claims',(claims||jsonb_build_object('aal','aal1'))::text,true);
  if private.has_verified_mfa() and (public.get_my_content_access()->>'content_owner')::boolean then raise exception 'MFA downgrade granted ownership'; end if;
  perform set_config('request.jwt.claims',claims::text,true);

  select updated_at into timestamp_before from public.subjects where id=ctx->>'sid';
  item:=public.set_course_item_deleted('subject',ctx->>'sid',true,timestamp_before);
  if (item->>'is_active')::boolean or item->>'deleted_at' is null or item->>'deleted_by'<>claims->>'sub' then raise exception 'Archive state/actor is incorrect'; end if;
  if (select count(*) from public.questions where exercise_id=ctx->>'eid')<>1 or
     (select count(*) from public.lessons where chapter_id=ctx->>'cid')<>1 then raise exception 'Archive deleted descendants'; end if;
  if public.set_course_item_deleted('subject',ctx->>'sid',true,timestamp_before)<>item then raise exception 'Delete retry was not idempotent'; end if;
  denied:=false;
  begin perform public.set_course_item_deleted('subject',ctx->>'sid',false,'2000-01-01'::timestamptz);
  exception when serialization_failure then denied:=true; end;
  if not denied then raise exception 'Stale restore was accepted'; end if;
  item:=public.set_course_item_deleted('subject',ctx->>'sid',false,(item->>'updated_at')::timestamptz);
  if not (item->>'is_active')::boolean or item->>'deleted_at' is not null then raise exception 'Restore failed'; end if;

  select public.set_course_item_deleted('exercise',id,true,updated_at) into item from public.exercises where id=ctx->>'eid';
  perform public.set_course_item_deleted('chapter',id,true,updated_at) from public.chapters where id=ctx->>'cid';
  denied:=false;
  begin perform public.set_course_item_deleted('exercise',ctx->>'eid',false,(item->>'updated_at')::timestamptz);
  exception when foreign_key_violation then denied:=true; end;
  if not denied then raise exception 'Restored exercise inside deleted chapter'; end if;
  perform public.set_course_item_deleted('subject',id,true,updated_at) from public.subjects where id=ctx->>'sid';
  denied:=false;
  begin perform public.set_course_item_deleted('chapter',id,false,updated_at) from public.chapters where id=ctx->>'cid';
  exception when foreign_key_violation then denied:=true; end;
  if not denied then raise exception 'Restored chapter inside deleted subject'; end if;
  perform public.set_course_item_deleted('subject',id,false,updated_at) from public.subjects where id=ctx->>'sid';
  perform public.set_course_item_deleted('chapter',id,false,updated_at) from public.chapters where id=ctx->>'cid';
  perform public.set_course_item_deleted('exercise',id,false,updated_at) from public.exercises where id=ctx->>'eid';

  update public.subjects set is_active=false where id=ctx->>'sid';
  perform public.set_course_item_deleted('subject',id,true,updated_at) from public.subjects where id=ctx->>'sid';
  select public.set_course_item_deleted('subject',id,false,updated_at) into item from public.subjects where id=ctx->>'sid';
  if (item->>'is_active')::boolean then raise exception 'Restore exposed a previously hidden subject'; end if;

  denied:=false;
  begin insert into public.chapters(id,subject_id,title) values('test_dup_'||gen_random_uuid(),ctx->>'sid','  DELETION   FIXTURE  ');
  exception when unique_violation then denied:=true; end;
  if not denied then raise exception 'Duplicate course creation was accepted'; end if;
end $$;
reset role;
-- Same valid, MFA-satisfied editor session, but remove ownership temporarily.
update private.content_owners set enabled=false where user_id=(select (context->'owners'->0->>'sub')::uuid from course_delete_test_context);
set local role authenticated;
do $$
declare ctx jsonb; denied boolean;
begin
  select context into ctx from pg_temp.course_delete_test_context;
  perform set_config('request.jwt.claims',(ctx->'owners'->0)::text,true);
  if not private.is_editor() then raise exception 'Expected a valid non-owner editor test session'; end if;
  if (public.get_my_content_access()->>'content_owner')::boolean then raise exception 'Non-owner editor acquired deletion privileges'; end if;
  denied:=false;
  begin perform public.set_course_item_deleted('subject',id,true,updated_at) from public.subjects where id=ctx->>'sid';
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Non-owner RPC deletion succeeded'; end if;
  denied:=false;
  begin update public.subjects set deleted_at=now(),is_active=false where id=ctx->>'sid';
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Direct PATCH bypassed owner checks'; end if;
  delete from public.questions where exercise_id=ctx->>'eid';
  delete from public.lessons where chapter_id=ctx->>'cid';
  if (select count(*) from public.questions where exercise_id=ctx->>'eid')<>1 or
     (select count(*) from public.lessons where chapter_id=ctx->>'cid')<>1 then raise exception 'Direct DELETE bypassed owner checks'; end if;
end $$;
reset role;
set local role anon;
do $$
declare denied boolean:=false;
begin
  begin perform public.set_course_item_deleted('subject','anything',true,now());
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous deletion was allowed'; end if;
end $$;
reset role;
do $$
declare expected jsonb; actual jsonb;
begin
  select context->'counts' into expected from course_delete_test_context;
  select jsonb_build_array((select count(*) from public.questions),(select count(*) from public.lessons),
    (select count(*) from public.user_progress),(select count(*) from public.exercise_attempts)) into actual;
  if actual<>expected then raise exception 'Content/progress/attempt counts changed'; end if;
end $$;
rollback;
select 'PASS: owner access, member/editor/anonymous denial, direct PATCH/DELETE guards, session/MFA checks, subtree preservation, restore, stale requests and duplicate creation' as result;
