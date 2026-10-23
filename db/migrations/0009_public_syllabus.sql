-- Public syllabus of a published module: chapter and lesson TITLES only (never the lesson text), so visitors can see
-- what they would learn before buying. Lesson rows themselves stay hidden by RLS from anyone without access.
create function public_syllabus(p_slug text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select case when c.id is null then null else jsonb_build_object(
    'lessons', (select count(*) from lessons l where l.course_id = c.id and l.content_status = 'published')::int,
    'quiz_questions', (select count(*) from quiz_questions qq join quizzes q on q.id = qq.quiz_id where q.course_id = c.id)::int,
    'reading_minutes', coalesce((select ceil(sum(length(coalesce(l.body_md, ''))) / 1100.0) from lessons l where l.course_id = c.id and l.content_status = 'published'), 0)::int,
    'assignment', (select a.title from assignments a where a.course_id = c.id order by a.title limit 1),
    'chapters', coalesce((select jsonb_agg(jsonb_build_object(
        'title', ch.title,
        'lessons', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title, 'kind', l.kind, 'free_preview', l.is_free_preview) order by l.position)
                             from lessons l where l.chapter_id = ch.id and l.content_status = 'published'), '[]'::jsonb)) order by ch.position)
      from chapters ch where ch.course_id = c.id), '[]'::jsonb)) end
  from (select id from courses where slug = p_slug and status = 'published') c right join (select 1) x on true
$$;
revoke all on function public_syllabus(text) from public;
grant execute on function public_syllabus(text) to anon, authenticated, service_role;

-- The free preview lesson of a published module, readable by anyone (no account): the lesson flagged is_free_preview.
-- Only that lesson's text is exposed, and only while the module and the lesson are published.
create function public_preview_lesson(p_slug text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('title', l.title, 'body_md', l.body_md, 'chapter', ch.title, 'kind', l.kind)
  from courses c join lessons l on l.course_id = c.id join chapters ch on ch.id = l.chapter_id
  where c.slug = p_slug and c.status = 'published' and l.content_status = 'published' and l.is_free_preview and coalesce(btrim(l.body_md), '') <> ''
  order by ch.position, l.position limit 1
$$;
revoke all on function public_preview_lesson(text) from public;
grant execute on function public_preview_lesson(text) to anon, authenticated, service_role;
