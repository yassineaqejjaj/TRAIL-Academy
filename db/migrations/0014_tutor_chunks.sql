-- AI tutor: lesson text cut into searchable extracts ("chunks"), the base of retrieval with citations.
--
-- Extracts are derived from lessons.body_md by the application (src/lib/tutor/chunk.ts, `npm run tutor:index`). The search
-- text is accent-stripped by the application and indexed with the French dictionary. Row Level Security reuses the lesson
-- rules: a person only ever reads extracts of lessons they may read (their courses, free previews, administrators), so the
-- tutor can never retrieve paid content for someone without access, even if application code is wrong.

create table content_chunks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  position smallint not null,
  heading text not null,
  anchor text not null,
  body text not null,
  search_text text not null,
  tsv tsvector generated always as (to_tsvector('french', search_text)) stored,
  indexed_at timestamptz not null default now(),
  unique (lesson_id, position)
);
create index content_chunks_tsv_idx on content_chunks using gin (tsv);
create index content_chunks_course_idx on content_chunks (course_id);

alter table content_chunks enable row level security;
create policy content_chunks_read on content_chunks for select using (can_view_lesson(lesson_id) or is_admin());
-- Writes go through replace_lesson_chunks() below, never through direct table access.

-- Replaces all extracts of one lesson (the application passes the chunks it computed). Server only.
create function replace_lesson_chunks(p_lesson uuid, p_chunks jsonb) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_course uuid; v_count integer;
begin
  select course_id into v_course from lessons where id = p_lesson;
  if v_course is null then raise exception 'lesson_not_found'; end if;
  delete from content_chunks where lesson_id = p_lesson;
  insert into content_chunks (lesson_id, course_id, position, heading, anchor, body, search_text)
    select p_lesson, v_course, (c->>'position')::smallint, c->>'heading', c->>'anchor', c->>'body', c->>'search_text'
    from jsonb_array_elements(p_chunks) c;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Ranked extracts for a question, with the rules of the caller (SECURITY INVOKER: RLS applies).
-- p_query is a tsquery string built by the application from sanitised terms joined with " | ".
create function search_content_chunks(p_query text, p_course uuid default null, p_lesson uuid default null, p_limit integer default 6)
returns table (id uuid, lesson_id uuid, course_id uuid, heading text, anchor text, body text, rank real)
language sql stable security invoker set search_path = public, pg_temp as $$
  select c.id, c.lesson_id, c.course_id, c.heading, c.anchor, c.body,
         (ts_rank_cd(c.tsv, q.query) * case when p_lesson is not null and c.lesson_id = p_lesson then 1.6 else 1 end)::real as rank
  from content_chunks c, (select to_tsquery('french', p_query) as query) q
  where c.tsv @@ q.query and (p_course is null or c.course_id = p_course)
  order by rank desc, c.position
  limit least(greatest(p_limit, 1), 12)
$$;

revoke all on function replace_lesson_chunks(uuid, jsonb) from public, anon, authenticated;
grant execute on function replace_lesson_chunks(uuid, jsonb) to service_role;
revoke all on function search_content_chunks(text, uuid, uuid, integer) from public, anon;
grant execute on function search_content_chunks(text, uuid, uuid, integer) to authenticated;
