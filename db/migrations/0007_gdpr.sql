-- TRAIL Academy — personal data rights (GDPR articles 15 and 17).
-- export_my_data(): everything the platform holds about the signed-in user, as one JSON document.
-- anonymize_user(): erasure that keeps what the law requires us to keep (orders, payments, access grants)
-- stripped of any link to a person, and deletes everything else. Called by trusted server code only.

create function export_my_data() returns jsonb
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
    'consents', coalesce((select jsonb_agg(jsonb_build_object('purpose', purpose, 'granted', granted, 'policy_version', policy_version, 'created_at', created_at)) from consent_records where user_id = uid), '[]')
  ) into r;
  update profiles set export_requested_at = now() where id = uid;
  return r;
end $$;

create function anonymize_user(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_paths text[]; v_email text;
begin
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'unknown_user'; end if;
  if exists (select 1 from user_roles where user_id = p_user and role = 'admin') then raise exception 'admin_cannot_self_delete'; end if;
  select email into v_email from auth.users where id = p_user;

  -- Files to remove from object storage (the caller deletes them after this transaction commits).
  select coalesce(array_agg(storage_path), '{}') into v_paths from assignment_submissions where user_id = p_user and storage_path is not null;

  -- Learning data and free-text content: deleted.
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

revoke all on function export_my_data(), anonymize_user(uuid) from public, anon;
grant execute on function export_my_data() to authenticated;
grant execute on function anonymize_user(uuid) to service_role;
