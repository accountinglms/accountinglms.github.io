-- Add separate grading counts without rewriting existing attempt results.
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.exercise_attempts add column if not exists ungraded_count integer not null default 0;
alter table public.exercise_attempts add column if not exists gradable_questions integer;
alter table public.exercise_attempts drop constraint exercise_attempts_counts_check;
alter table public.exercise_attempts add constraint exercise_attempts_counts_check check
  (score=correct_count and correct_count+wrong_count+unanswered_count+ungraded_count=total_questions);
alter table public.exercise_attempts add constraint exercise_attempts_grading_counts_check check
  (ungraded_count>=0 and (gradable_questions is null or (gradable_questions>=correct_count+wrong_count and gradable_questions<=total_questions-ungraded_count)));

-- Preserve the RPC signature, caller permissions, live-session checks and RLS.
CREATE OR REPLACE FUNCTION public.record_exercise_attempt(p_exercise_id text, p_run_id uuid, p_started_at timestamp with time zone, p_score integer, p_total_questions integer, p_correct_count integer, p_wrong_count integer, p_unanswered_count integer, p_bookmarked_count integer, p_duration_seconds integer, p_answers_status jsonb, p_selected_answers jsonb, p_bookmarks jsonb, p_question_snapshot jsonb, p_context_snapshot jsonb DEFAULT '{}'::jsonb, p_submitted_from text DEFAULT 'web'::text)
 RETURNS TABLE(id uuid, attempt_no integer, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_id uuid;
  v_attempt_no integer;
  v_completed_at timestamptz;
  v_answered integer;
  v_ungraded integer;
  v_gradable integer;
  v_accuracy numeric;
  v_started_at timestamptz;
  v_duration_seconds integer;
begin
  if auth.uid() is null or not private.is_allowed_user() then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  if p_exercise_id is null or btrim(p_exercise_id) = '' then
    raise exception 'INVALID_EXERCISE';
  end if;
  if p_run_id is null then
    raise exception 'INVALID_RUN_ID';
  end if;
  if jsonb_typeof(coalesce(p_answers_status,'[]'::jsonb))<>'array'
     or jsonb_typeof(coalesce(p_question_snapshot,'[]'::jsonb))<>'array' then
    raise exception 'INVALID_ATTEMPT_SNAPSHOT';
  end if;
  select count(*)::integer into v_ungraded from jsonb_array_elements(coalesce(p_answers_status,'[]'::jsonb)) s(value) where value='"ungraded"'::jsonb;
  if p_total_questions is null or p_score is null or p_correct_count is null or p_wrong_count is null or p_unanswered_count is null or p_bookmarked_count is null
     or p_total_questions < 0
     or p_score < 0
     or p_correct_count < 0
     or p_wrong_count < 0
     or p_unanswered_count < 0
     or p_bookmarked_count < 0
     or p_score <> p_correct_count
     or p_correct_count + p_wrong_count + p_unanswered_count + v_ungraded <> p_total_questions then
    raise exception 'INVALID_ATTEMPT_COUNTS';
  end if;

  v_gradable := p_total_questions-v_ungraded;
  if jsonb_array_length(coalesce(p_question_snapshot,'[]'::jsonb))=p_total_questions
     and not exists(select 1 from jsonb_array_elements(coalesce(p_question_snapshot,'[]'::jsonb)) q where jsonb_typeof(q->'gradable') is distinct from 'boolean') then
    select count(*)::integer into v_gradable from jsonb_array_elements(coalesce(p_question_snapshot,'[]'::jsonb)) q where q->'gradable'='true'::jsonb;
  end if;
  if v_gradable<p_correct_count+p_wrong_count or v_gradable>p_total_questions-v_ungraded then
    raise exception 'INVALID_GRADABLE_COUNTS';
  end if;
  if jsonb_array_length(coalesce(p_answers_status,'[]'::jsonb))=p_total_questions and (
    (select count(*) from jsonb_array_elements(p_answers_status) s(value) where value='"correct"'::jsonb)<>p_correct_count or
    (select count(*) from jsonb_array_elements(p_answers_status) s(value) where value='"wrong"'::jsonb)<>p_wrong_count) then
    raise exception 'INVALID_ATTEMPT_STATUSES';
  end if;
  v_answered := p_correct_count+p_wrong_count;
  v_accuracy := case
    when v_answered > 0 then round((p_correct_count::numeric * 100) / v_answered, 2)
    else null
  end;

  -- History launched on 2026-10-09. Any earlier start timestamp cannot
  -- have been measured by this feature. Treat it as unknown instead of
  -- manufacturing a multi-year duration. Also reject impossible/future
  -- client clocks and any single quiz duration above 24 hours.
  if p_started_at is null
     or p_started_at < timestamptz '2026-10-09 00:00:00+00'
     or p_started_at > clock_timestamp() + interval '5 minutes'
     or p_duration_seconds is null
     or p_duration_seconds < 0
     or p_duration_seconds > 86400 then
    v_started_at := clock_timestamp();
    v_duration_seconds := null;
  else
    v_started_at := p_started_at;
    v_duration_seconds := p_duration_seconds;
  end if;

  insert into public.exercise_attempts (
    user_id,
    exercise_id,
    run_id,
    score,
    total_questions,
    accuracy,
    started_at,
    correct_count,
    wrong_count,
    unanswered_count,
    ungraded_count,
    gradable_questions,
    bookmarked_count,
    duration_seconds,
    answers_status,
    selected_answers,
    bookmarks,
    question_snapshot,
    context_snapshot,
    submitted_from
  )
  values (
    auth.uid(),
    p_exercise_id,
    p_run_id,
    p_score,
    p_total_questions,
    v_accuracy,
    v_started_at,
    p_correct_count,
    p_wrong_count,
    p_unanswered_count,
    v_ungraded,
    v_gradable,
    p_bookmarked_count,
    v_duration_seconds,
    coalesce(p_answers_status, '[]'::jsonb),
    coalesce(p_selected_answers, '[]'::jsonb),
    coalesce(p_bookmarks, '[]'::jsonb),
    coalesce(p_question_snapshot, '[]'::jsonb),
    coalesce(p_context_snapshot, '{}'::jsonb),
    left(coalesce(nullif(btrim(p_submitted_from), ''), 'web'), 80)
  )
  on conflict (user_id, exercise_id, run_id) do nothing
  returning exercise_attempts.id, exercise_attempts.attempt_no, exercise_attempts.completed_at
    into v_id, v_attempt_no, v_completed_at;

  if v_id is null then
    select a.id, a.attempt_no, a.completed_at
      into v_id, v_attempt_no, v_completed_at
    from public.exercise_attempts a
    where a.user_id = auth.uid()
      and a.exercise_id = p_exercise_id
      and a.run_id = p_run_id;
  end if;

  return query select v_id, v_attempt_no, v_completed_at;
end;
$function$

