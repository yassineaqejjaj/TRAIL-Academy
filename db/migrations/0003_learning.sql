-- TRAIL Academy — learning platform (Phase B)
-- Progress, quiz grading, completion rules and attestations run as SECURITY DEFINER functions so
-- every state change is transactional and cannot be forged from the client.

-- ───────── Completion rules: explicit keys ─────────
alter table courses alter column completion_rules set default
  '{"requireAllLessons": true, "requireQuizzes": true, "requireAssignments": true}';
update courses set completion_rules = '{"requireAllLessons": true, "requireQuizzes": true, "requireAssignments": true}';

-- ───────── Player metadata ─────────
-- subtitle_tracks: [{ "lang": "fr", "label": "Français", "path": "<lesson-resources path>" }]
-- video_chapters:  [{ "title": "Introduction", "start_seconds": 0 }]
alter table lessons add column subtitle_tracks jsonb not null default '[]' check (jsonb_typeof(subtitle_tracks) = 'array');
alter table lessons add column video_chapters jsonb not null default '[]' check (jsonb_typeof(video_chapters) = 'array');

-- ───────── Notes & bookmarks ─────────
create table lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  position_seconds integer check (position_seconds >= 0),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create table lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  position_seconds integer not null check (position_seconds >= 0),
  label text check (char_length(label) <= 200),
  unique (user_id, lesson_id, position_seconds)
);
alter table lesson_notes enable row level security;
alter table lesson_bookmarks enable row level security;
create policy notes_own_read on lesson_notes for select using (user_id = auth.uid());
create policy notes_own_insert on lesson_notes for insert with check (user_id = auth.uid() and can_view_lesson(lesson_id));
create policy notes_own_delete on lesson_notes for delete using (user_id = auth.uid());
create policy bookmarks_own_read on lesson_bookmarks for select using (user_id = auth.uid());
create policy bookmarks_own_insert on lesson_bookmarks for insert with check (user_id = auth.uid() and can_view_lesson(lesson_id));
create policy bookmarks_own_delete on lesson_bookmarks for delete using (user_id = auth.uid());

-- ───────── Progress is written only through record_lesson_progress() ─────────
drop policy lesson_progress_own_write on lesson_progress;
drop policy lesson_progress_own_update on lesson_progress;

-- ───────── Assignments: submissions require an active entitlement and a path inside the user's folder ─────────
alter table assignment_submissions add constraint submission_has_content check (body is not null or storage_path is not null);
drop policy submissions_own_insert on assignment_submissions;
create policy submissions_own_insert on assignment_submissions for insert with check (
  user_id = auth.uid() and status = 'submitted' and instructor_feedback is null and reviewed_at is null
  and (storage_path is null or storage_path like 'submissions/' || auth.uid()::text || '/%')
  and exists (select 1 from assignments a where a.id = assignment_id and has_active_entitlement(a.course_id))
);

-- ───────── Internal helpers (not callable by clients) ─────────
create function recompute_progress(p_user uuid, p_course uuid) returns smallint
language plpgsql security definer set search_path = public as $$
declare done int; total int; pct smallint;
begin
  select count(*) filter (where lp.completed_at is not null), count(*)
    into done, total
  from lessons l
  left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = p_user
  where l.course_id = p_course and l.content_status = 'published' and l.required;
  pct := case when total = 0 then 0 else floor(100.0 * done / total) end;
  insert into learner_progress (user_id, course_id, percent) values (p_user, p_course, pct)
  on conflict (user_id, course_id) do update set percent = excluded.percent, updated_at = now();
  return pct;
end $$;

-- Evaluates the course's completion rules; on success marks the enrollment complete and issues the
-- attestation exactly once. Safe to call repeatedly.
create function try_complete_course(p_user uuid, p_course uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare rules jsonb; ok boolean := true; pct smallint; code text; completed timestamptz;
begin
  select completion_rules into rules from courses where id = p_course;
  pct := recompute_progress(p_user, p_course);

  select completed_at into completed from enrollments where user_id = p_user and course_id = p_course;
  if completed is null then
    -- A course without published lessons can never be completed.
    if not exists (select 1 from lessons where course_id = p_course and content_status = 'published') then ok := false; end if;

    if ok and coalesce((rules->>'requireAllLessons')::boolean, true) and exists (
      select 1 from lessons l
      where l.course_id = p_course and l.content_status = 'published' and l.required
        and not exists (select 1 from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = p_user and lp.completed_at is not null)
    ) then ok := false; end if;

    if ok and coalesce((rules->>'requireQuizzes')::boolean, true) and exists (
      select 1 from quizzes q where q.course_id = p_course
        and not exists (select 1 from quiz_attempts a where a.quiz_id = q.id and a.user_id = p_user and a.passed)
    ) then ok := false; end if;

    if ok and coalesce((rules->>'requireAssignments')::boolean, true) and exists (
      select 1 from assignments a where a.course_id = p_course and a.required
        and not exists (select 1 from assignment_submissions s where s.assignment_id = a.id and s.user_id = p_user and s.status = 'accepted')
    ) then ok := false; end if;

    if ok then
      update enrollments set completed_at = now() where user_id = p_user and course_id = p_course and completed_at is null;
      insert into attestations (user_id, course_id) values (p_user, p_course) on conflict (user_id, course_id) do nothing;
    end if;
  end if;

  select a.verification_code into code from attestations a where a.user_id = p_user and a.course_id = p_course;
  return jsonb_build_object('percent', pct, 'completed', exists (select 1 from enrollments where user_id = p_user and course_id = p_course and completed_at is not null), 'attestation_code', code);
end $$;
revoke all on function recompute_progress(uuid, uuid), try_complete_course(uuid, uuid) from public, anon, authenticated;

-- ───────── Client-callable RPCs ─────────
create function record_lesson_progress(p_lesson uuid, p_position integer, p_completed boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_course uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select course_id into v_course from lessons where id = p_lesson and content_status = 'published';
  if v_course is null or not has_active_entitlement(v_course) then raise exception 'access denied'; end if;

  insert into lesson_progress (user_id, lesson_id, position_seconds, completed_at)
  values (uid, p_lesson, greatest(coalesce(p_position, 0), 0), case when p_completed then now() end)
  on conflict (user_id, lesson_id) do update
    set position_seconds = excluded.position_seconds,
        completed_at = coalesce(lesson_progress.completed_at, excluded.completed_at), -- completion is never undone
        updated_at = now();

  insert into enrollments (user_id, course_id, last_lesson_id) values (uid, v_course, p_lesson)
  on conflict (user_id, course_id) do update set last_lesson_id = p_lesson;

  return try_complete_course(uid, v_course);
end $$;

-- Quiz options without the answer key (quiz_options itself is admin-only under RLS).
create function get_quiz_options(p_quiz uuid) returns table (question_id uuid, option_id uuid, label text, "position" smallint)
language sql stable security definer set search_path = public as $$
  select o.question_id, o.id, o.label, o.position
  from quiz_options o
  join quiz_questions qq on qq.id = o.question_id
  join quizzes q on q.id = qq.quiz_id
  where qq.quiz_id = p_quiz and has_active_entitlement(q.course_id)
  order by qq.position, o.position
$$;

-- Objective grading. answers = { "<question_id>": ["<option_id>", ...] | "free text" }.
-- Choice questions are all-or-nothing. Free-text answers are stored for instructor review and do not
-- count towards the automated score (no automated final authority).
create function submit_quiz(p_quiz uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); q quizzes%rowtype; qq record;
  earned int := 0; maxpts int := 0; selected uuid[]; correct uuid[];
  results jsonb := '[]'::jsonb; is_ok boolean; needs_review boolean := false;
  score numeric(5,2); did_pass boolean; attempt_id uuid; n_attempts int; completion jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into q from quizzes where id = p_quiz;
  if not found or not has_active_entitlement(q.course_id) then raise exception 'access denied'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'invalid answers'; end if;

  select count(*) into n_attempts from quiz_attempts where quiz_id = p_quiz and user_id = uid;
  if q.max_attempts is not null and n_attempts >= q.max_attempts then raise exception 'attempt limit reached'; end if;

  for qq in select * from quiz_questions where quiz_id = p_quiz order by position loop
    if qq.kind = 'free_text' then
      needs_review := true;
      results := results || jsonb_build_object('question_id', qq.id, 'correct', null, 'feedback', qq.feedback);
    else
      maxpts := maxpts + qq.points;
      select coalesce(array_agg(x::uuid order by x::uuid), '{}') into selected
        from jsonb_array_elements_text(case when jsonb_typeof(p_answers->qq.id::text) = 'array' then p_answers->qq.id::text else '[]'::jsonb end) x;
      select coalesce(array_agg(id order by id), '{}') into correct from quiz_options where question_id = qq.id and is_correct;
      is_ok := cardinality(correct) > 0 and selected = correct and (qq.kind = 'multiple_choice' or cardinality(selected) = 1);
      if is_ok then earned := earned + qq.points; end if;
      results := results || jsonb_build_object('question_id', qq.id, 'correct', is_ok, 'feedback', qq.feedback);
    end if;
  end loop;

  score := case when maxpts = 0 then 0 else round(100.0 * earned / maxpts, 2) end;
  did_pass := maxpts > 0 and score >= q.pass_percent;
  insert into quiz_attempts (quiz_id, user_id, answers, score_percent, passed) values (p_quiz, uid, p_answers, score, did_pass) returning id into attempt_id;
  completion := try_complete_course(uid, q.course_id);
  return jsonb_build_object('attempt_id', attempt_id, 'score', score, 'passed', did_pass, 'needs_review', needs_review, 'results', results, 'completion', completion);
end $$;

-- Assignment acceptance by the instructor re-evaluates completion.
create function on_submission_reviewed() returns trigger language plpgsql security definer set search_path = public as $$
declare v_course uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end $$;
create trigger submissions_before_review before update on assignment_submissions for each row execute function on_submission_reviewed();

create function after_submission_reviewed() returns trigger language plpgsql security definer set search_path = public as $$
declare v_course uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select course_id into v_course from assignments where id = new.assignment_id;
    perform try_complete_course(new.user_id, v_course);
  end if;
  return null;
end $$;
create trigger submissions_after_review after update on assignment_submissions for each row execute function after_submission_reviewed();

-- Public verification by unguessable code. Returns minimal data; the holder shares the code deliberately.
create function verify_attestation(p_code text) returns table (course_title text, issued_at timestamptz, holder_name text)
language sql stable security definer set search_path = public as $$
  select c.title, a.issued_at, p.full_name
  from attestations a join courses c on c.id = a.course_id join profiles p on p.id = a.user_id
  where a.verification_code = p_code
$$;

-- Maintenance: flag lapsed entitlements (run by a scheduled job with the service role).
create function expire_entitlements() returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update entitlements set status = 'expired' where status = 'active' and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function record_lesson_progress(uuid, integer, boolean), get_quiz_options(uuid), submit_quiz(uuid, jsonb), verify_attestation(text), expire_entitlements() from public, anon, authenticated;
grant execute on function record_lesson_progress(uuid, integer, boolean), get_quiz_options(uuid), submit_quiz(uuid, jsonb) to authenticated;
grant execute on function verify_attestation(text) to anon, authenticated;
grant execute on function expire_entitlements() to service_role;
