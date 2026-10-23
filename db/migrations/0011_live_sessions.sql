-- TRAIL Academy — live training sessions by video (workshops, Q&A): calendar, booking, waiting list, private meeting link.
-- Rules live here, in PostgreSQL: capacity and waiting list are decided under a row lock, access to the meeting link needs a booking.

create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  course_id uuid references courses(id) on delete set null,       -- module the session is about (optional)
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  capacity integer not null check (capacity between 1 and 500),
  audience text not null default 'learners' check (audience in ('learners', 'open')),  -- learners: holders of the module; open: any account
  meeting_url text not null check (meeting_url ~ '^https://[^\s]+$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'canceled')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index live_sessions_start_idx on live_sessions (starts_at);

create table session_bookings (
  session_id uuid not null references live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('booked', 'waitlist', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table live_sessions enable row level security;
alter table session_bookings enable row level security;
-- The meeting link is never readable through the table: only through session_meeting_url() for people who booked.
revoke select on live_sessions from anon, authenticated;
grant select (id, title, description, course_id, starts_at, duration_minutes, capacity, audience, status, created_at) on live_sessions to anon, authenticated;
revoke insert, update, delete on live_sessions from anon, authenticated;
revoke insert, update, delete on session_bookings from anon, authenticated;
create policy live_sessions_read on live_sessions for select using (status in ('published', 'canceled') or is_admin());
create policy session_bookings_own on session_bookings for select using (user_id = auth.uid() or is_admin());

-- Listing with remaining seats, for anyone (no names, no link). from/to bound the calendar window.
create function list_sessions(p_from timestamptz default now() - interval '1 day', p_to timestamptz default now() + interval '120 days') returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'title', s.title, 'description', s.description, 'course_code', c.code, 'course_slug', c.slug, 'course_title', c.title,
    'starts_at', s.starts_at, 'duration_minutes', s.duration_minutes, 'capacity', s.capacity, 'audience', s.audience, 'status', s.status,
    'booked', (select count(*) from session_bookings b where b.session_id = s.id and b.status = 'booked')::int,
    'waitlist', (select count(*) from session_bookings b where b.session_id = s.id and b.status = 'waitlist')::int
  ) order by s.starts_at), '[]'::jsonb)
  from live_sessions s left join courses c on c.id = s.course_id
  where s.status in ('published', 'canceled') and s.starts_at between p_from and p_to
$$;

create function get_session(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', s.id, 'title', s.title, 'description', s.description, 'course_code', c.code, 'course_slug', c.slug, 'course_title', c.title,
    'starts_at', s.starts_at, 'duration_minutes', s.duration_minutes, 'capacity', s.capacity, 'audience', s.audience, 'status', s.status,
    'booked', (select count(*) from session_bookings b where b.session_id = s.id and b.status = 'booked')::int,
    'waitlist', (select count(*) from session_bookings b where b.session_id = s.id and b.status = 'waitlist')::int)
  from live_sessions s left join courses c on c.id = s.course_id
  where s.id = p_id and (s.status in ('published', 'canceled') or is_admin())
$$;

-- The private link: administrators, and people with a confirmed booking on a published session.
create function session_meeting_url(p_id uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select s.meeting_url from live_sessions s
  where s.id = p_id and (is_admin() or (s.status = 'published' and exists (select 1 from session_bookings b where b.session_id = s.id and b.user_id = auth.uid() and b.status = 'booked')))
$$;

-- Booking: confirmed while seats remain, otherwise on the waiting list. One row per person and session.
create function book_session(p_id uuid) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare s live_sessions; v_status text; v_taken integer; v_existing text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into s from live_sessions where id = p_id for update;           -- serialises concurrent bookings of this session
  if not found or s.status <> 'published' then raise exception 'session_unavailable'; end if;
  if s.starts_at <= now() then raise exception 'session_started'; end if;
  if s.audience = 'learners' then
    if not (case when s.course_id is null then exists (select 1 from entitlements where user_id = auth.uid() and status = 'active' and starts_at <= now() and expires_at > now())
                 else has_active_entitlement(s.course_id) end) then raise exception 'access_required'; end if;
  end if;
  select status into v_existing from session_bookings where session_id = p_id and user_id = auth.uid();
  if v_existing in ('booked', 'waitlist') then return v_existing; end if;
  select count(*) into v_taken from session_bookings where session_id = p_id and status = 'booked';
  v_status := case when v_taken < s.capacity then 'booked' else 'waitlist' end;
  insert into session_bookings (session_id, user_id, status) values (p_id, auth.uid(), v_status)
    on conflict (session_id, user_id) do update set status = excluded.status, created_at = now(), updated_at = now();
  return v_status;
end $$;

-- Cancelling frees the seat for the first person on the waiting list, whose id is returned so the app can tell them.
create function cancel_booking(p_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare s live_sessions; v_was text; v_next uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into s from live_sessions where id = p_id for update;
  if not found then raise exception 'session_unavailable'; end if;
  select status into v_was from session_bookings where session_id = p_id and user_id = auth.uid();
  if v_was is null or v_was = 'canceled' then return null; end if;
  update session_bookings set status = 'canceled', updated_at = now() where session_id = p_id and user_id = auth.uid();
  if v_was = 'booked' and s.status = 'published' and s.starts_at > now() then
    select user_id into v_next from session_bookings where session_id = p_id and status = 'waitlist' order by created_at limit 1 for update skip locked;
    if v_next is not null then update session_bookings set status = 'booked', updated_at = now() where session_id = p_id and user_id = v_next; end if;
  end if;
  return v_next;
end $$;

-- Administration -------------------------------------------------------------------------------------------------------
-- p_local_start is the wall-clock time in Paris (no time zone in the form), converted here so daylight-saving time is right.
create function admin_save_session(p_id uuid, p_title text, p_description text, p_course uuid, p_local_start timestamp, p_duration integer, p_capacity integer, p_audience text, p_meeting_url text, p_status text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid := p_id; v_url text := nullif(btrim(coalesce(p_meeting_url, '')), '');
begin
  perform require_admin();
  if p_status not in ('draft', 'published') then raise exception 'invalid_status'; end if;
  if v_id is null then
    -- Default room: an unguessable name on the open-source Jitsi Meet service. Replace it with any other video link.
    insert into live_sessions (title, description, course_id, starts_at, duration_minutes, capacity, audience, meeting_url, status, created_by)
      values (btrim(p_title), coalesce(p_description, ''), p_course, p_local_start at time zone 'Europe/Paris', p_duration, p_capacity, p_audience,
              coalesce(v_url, 'https://meet.jit.si/TRAIL-' || encode(gen_random_bytes(12), 'hex')), p_status, auth.uid()) returning id into v_id;
    perform log_admin_action('session.created', 'live_session', v_id::text);
  else
    update live_sessions set title = btrim(p_title), description = coalesce(p_description, ''), course_id = p_course, starts_at = p_local_start at time zone 'Europe/Paris',
      duration_minutes = p_duration, capacity = p_capacity, audience = p_audience, meeting_url = coalesce(v_url, meeting_url), status = case when status = 'canceled' then status else p_status end
      where id = v_id;
    if not found then raise exception 'unknown_session'; end if;
    -- A larger capacity seats people from the waiting list, oldest first.
    update session_bookings b set status = 'booked', updated_at = now() where b.session_id = v_id and b.status = 'waitlist' and b.user_id in (
      select user_id from session_bookings w where w.session_id = v_id and w.status = 'waitlist' order by w.created_at
      limit greatest(0, p_capacity - (select count(*) from session_bookings x where x.session_id = v_id and x.status = 'booked')));
    perform log_admin_action('session.updated', 'live_session', v_id::text);
  end if;
  return v_id;
end $$;

create function admin_cancel_session(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform require_admin();
  update live_sessions set status = 'canceled' where id = p_id and status <> 'canceled';
  if not found then raise exception 'unknown_session'; end if;
  perform log_admin_action('session.canceled', 'live_session', p_id::text);
end $$;

create function admin_delete_session(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform require_admin();
  if exists (select 1 from session_bookings where session_id = p_id and status <> 'canceled') then raise exception 'has_bookings'; end if;
  delete from live_sessions where id = p_id;
  perform log_admin_action('session.deleted', 'live_session', p_id::text);
end $$;

create function admin_session_attendees(p_id uuid) returns table (user_id uuid, name text, email text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform require_admin();
  return query select b.user_id, u.name, u.email, b.status, b.created_at from session_bookings b join auth.users u on u.id = b.user_id
    where b.session_id = p_id and b.status <> 'canceled' order by (b.status = 'booked') desc, b.created_at;
end $$;

create function my_sessions() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'starts_at', s.starts_at, 'duration_minutes', s.duration_minutes, 'status', s.status, 'booking', b.status, 'course_code', c.code) order by s.starts_at), '[]'::jsonb)
  from session_bookings b join live_sessions s on s.id = b.session_id left join courses c on c.id = s.course_id
  where b.user_id = auth.uid() and b.status in ('booked', 'waitlist') and s.starts_at > now() - interval '1 day'
$$;

revoke all on function list_sessions(timestamptz, timestamptz), get_session(uuid), session_meeting_url(uuid), book_session(uuid), cancel_booking(uuid), my_sessions(),
  admin_save_session(uuid, text, text, uuid, timestamp, integer, integer, text, text, text), admin_cancel_session(uuid), admin_delete_session(uuid), admin_session_attendees(uuid) from public, anon;
grant execute on function list_sessions(timestamptz, timestamptz), get_session(uuid) to anon, authenticated, service_role;
grant execute on function session_meeting_url(uuid), book_session(uuid), cancel_booking(uuid), my_sessions(),
  admin_save_session(uuid, text, text, uuid, timestamp, integer, integer, text, text, text), admin_cancel_session(uuid), admin_delete_session(uuid), admin_session_attendees(uuid) to authenticated;
grant execute on function session_meeting_url(uuid) to service_role;

-- Service role only: the contact of one person, used to e-mail them (the auth schema is not readable by the application roles).
create function user_contact(p_user uuid) returns table (email text, name text)
language sql stable security definer set search_path = public, auth, pg_temp as $$ select u.email, u.name from auth.users u where u.id = p_user $$;
revoke all on function user_contact(uuid) from public, anon, authenticated;
grant execute on function user_contact(uuid) to service_role;

-- Personal data rights now cover bookings (export and erasure).
create or replace function export_my_data() returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare uid uuid := auth.uid(); r jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'name', u.name, 'email_verified', u.email_verified, 'created_at', u.created_at) from auth.users u where u.id = uid),
    'profile', (select to_jsonb(p) - 'id' from profiles p where p.id = uid),
    'roles', coalesce((select jsonb_agg(role) from user_roles where user_id = uid), '[]'),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'status', o.status, 'total_cents', o.total_cents, 'currency', o.currency, 'tax_cents', o.tax_cents, 'created_at', o.created_at,
        'items', coalesce((select jsonb_agg(jsonb_build_object('product', pr.title, 'unit_amount_cents', oi.unit_amount_cents, 'access_months', oi.access_months)) from order_items oi join products pr on pr.id = oi.product_id where oi.order_id = o.id), '[]')))
      from orders o where o.user_id = uid), '[]'),
    'access', coalesce((select jsonb_agg(jsonb_build_object('course', c.title, 'status', e.status, 'expires_at', e.expires_at, 'created_at', e.created_at)) from entitlements e join courses c on c.id = e.course_id where e.user_id = uid), '[]'),
    'progress', coalesce((select jsonb_agg(jsonb_build_object('course', c.title, 'percent', lp.percent, 'updated_at', lp.updated_at)) from learner_progress lp join courses c on c.id = lp.course_id where lp.user_id = uid), '[]'),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object('lesson', l.title, 'position_seconds', p.position_seconds, 'completed_at', p.completed_at)) from lesson_progress p join lessons l on l.id = p.lesson_id where p.user_id = uid), '[]'),
    'quiz_attempts', coalesce((select jsonb_agg(jsonb_build_object('quiz', q.title, 'score_percent', a.score_percent, 'passed', a.passed, 'answers', a.answers)) from quiz_attempts a join quizzes q on q.id = a.quiz_id where a.user_id = uid), '[]'),
    'submissions', coalesce((select jsonb_agg(jsonb_build_object('assignment', asg.title, 'body', s.body, 'has_file', s.storage_path is not null, 'status', s.status, 'feedback', s.instructor_feedback, 'submitted_at', s.submitted_at)) from assignment_submissions s join assignments asg on asg.id = s.assignment_id where s.user_id = uid), '[]'),
    'attestations', coalesce((select jsonb_agg(jsonb_build_object('course', c.title, 'verification_code', a.verification_code, 'issued_at', a.issued_at)) from attestations a join courses c on c.id = a.course_id where a.user_id = uid), '[]'),
    'notes', coalesce((select jsonb_agg(to_jsonb(n) - 'user_id') from lesson_notes n where n.user_id = uid), '[]'),
    'bookmarks', coalesce((select jsonb_agg(to_jsonb(b) - 'user_id') from lesson_bookmarks b where b.user_id = uid), '[]'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('title', s.title, 'starts_at', s.starts_at, 'status', b.status, 'booked_at', b.created_at)) from session_bookings b join live_sessions s on s.id = b.session_id where b.user_id = uid), '[]'),
    'consents', coalesce((select jsonb_agg(jsonb_build_object('purpose', purpose, 'granted', granted, 'policy_version', policy_version, 'created_at', created_at)) from consent_records where user_id = uid), '[]')
  ) into r;
  update profiles set export_requested_at = now() where id = uid;
  return r;
end $$;

create or replace function anonymize_user(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_paths text[]; v_email text;
begin
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'unknown_user'; end if;
  if exists (select 1 from user_roles where user_id = p_user and role = 'admin') then raise exception 'admin_cannot_self_delete'; end if;
  select email into v_email from auth.users where id = p_user;

  -- Files to remove from object storage (the caller deletes them after this transaction commits).
  select coalesce(array_agg(storage_path), '{}') into v_paths from assignment_submissions where user_id = p_user and storage_path is not null;

  -- Learning data and free-text content: deleted.
  delete from session_bookings where user_id = p_user;
  delete from lesson_notes where user_id = p_user;
  delete from lesson_bookmarks where user_id = p_user;
  delete from lesson_progress where user_id = p_user;
  delete from learner_progress where user_id = p_user;
  delete from enrollments where user_id = p_user;
  delete from quiz_attempts where user_id = p_user;
  delete from assignment_submissions where user_id = p_user;
  delete from attestations where user_id = p_user;
  delete from license_allocations where user_id = p_user;
  delete from organization_members where user_id = p_user;
  delete from user_roles where user_id = p_user;
  delete from interest_signups where email = v_email;

  -- Proof of consent is kept, unlinked from the person.
  update consent_records set user_id = null, anonymous_id = 'erased' where user_id = p_user;

  -- Orders, payments and access grants stay (accounting retention) but point to an account that no longer identifies anyone.
  update profiles set email = 'deleted+' || p_user || '@deleted.invalid', full_name = null, stripe_customer_id = null, deletion_requested_at = coalesce(deletion_requested_at, now()) where id = p_user;
  delete from auth.sessions where user_id = p_user;
  delete from auth.accounts where user_id = p_user;
  delete from auth.verifications where identifier = v_email;
  update auth.users set email = 'deleted+' || p_user || '@deleted.invalid', name = 'Compte supprimé', image = null, email_verified = false where id = p_user;

  insert into audit_logs (actor_id, action, entity, entity_id) values (null, 'user.anonymized', 'user', p_user::text);
  return jsonb_build_object('storage_paths', to_jsonb(v_paths));
end $$;
