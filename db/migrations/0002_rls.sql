-- TRAIL Academy — Row Level Security
-- Principle: RLS enabled on every table; default deny. Privileged writes (orders, entitlements,
-- webhook events, audit logs) happen only through the service role on the server.

-- ───────── Helper functions ─────────
create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
$$;

create function is_org_manager(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members
                 where organization_id = p_org and user_id = auth.uid() and role = 'manager')
$$;

create function has_active_entitlement(p_course uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from entitlements
                 where user_id = auth.uid() and course_id = p_course
                   and status = 'active' and starts_at <= now() and expires_at > now())
$$;

create function can_view_lesson(p_lesson uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lessons l
    where l.id = p_lesson and l.content_status = 'published'
      and (l.is_free_preview or has_active_entitlement(l.course_id) or is_admin())
  )
$$;

-- ───────── Enable RLS everywhere ─────────
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ───────── Public catalog (read) / admin (write) ─────────
do $$
declare t text;
begin
  foreach t in array array['learning_phases', 'learning_paths', 'learning_path_courses', 'course_prerequisites', 'chapters'] loop
    execute format('create policy %I on %I for select using (true)', t || '_public_read', t);
    execute format('create policy %I on %I for all using (is_admin()) with check (is_admin())', t || '_admin_all', t);
  end loop;
end $$;

create policy courses_public_read on courses for select using (status <> 'draft' or is_admin());
create policy courses_admin_all on courses for all using (is_admin()) with check (is_admin());

-- Lesson rows: metadata readable by entitled learners and previews; admin full access.
create policy lessons_read on lessons for select using (can_view_lesson(id) or is_admin());
create policy lessons_admin_all on lessons for all using (is_admin()) with check (is_admin());

create policy lesson_resources_read on lesson_resources for select using (can_view_lesson(lesson_id) or is_admin());
create policy lesson_resources_admin_all on lesson_resources for all using (is_admin()) with check (is_admin());

-- Products and prices are public (display); writes admin only.
-- Offers are display data: closed offers stay visible (with their planned price) so the public site can show "coming soon".
create policy products_public_read on products for select using (true);
create policy products_admin_all on products for all using (is_admin()) with check (is_admin());
create policy product_course_access_public_read on product_course_access for select using (true);
create policy product_course_access_admin_all on product_course_access for all using (is_admin()) with check (is_admin());
create policy prices_public_read on prices for select using (active or is_admin());
create policy prices_admin_all on prices for all using (is_admin()) with check (is_admin());
create policy coupons_admin_all on coupons for all using (is_admin()) with check (is_admin());

-- ───────── Identity ─────────
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Org managers see only profiles of members of organizations they manage.
create policy profiles_org_manager_read on profiles for select using (
  exists (select 1 from organization_members m
          join organization_members mgr on mgr.organization_id = m.organization_id
          where m.user_id = profiles.id and mgr.user_id = auth.uid() and mgr.role = 'manager')
);
create policy user_roles_self_read on user_roles for select using (user_id = auth.uid() or is_admin());
-- No insert/update/delete policy on user_roles: roles are changed by the service role only.

-- ───────── Commerce (read own; writes via service role) ─────────
create policy orders_own_read on orders for select using (user_id = auth.uid() or is_admin());
create policy order_items_own_read on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy payments_own_read on payments for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy entitlements_own_read on entitlements for select using (user_id = auth.uid() or is_admin());
-- processed_webhook_events, audit_logs, email_events: no policies => service role only (admin read below).
create policy audit_logs_admin_read on audit_logs for select using (is_admin());
create policy email_events_admin_read on email_events for select using (is_admin());
create policy webhook_events_admin_read on processed_webhook_events for select using (is_admin());

-- ───────── Enterprise ─────────
create policy organizations_member_read on organizations for select using (
  is_admin() or exists (select 1 from organization_members where organization_id = id and user_id = auth.uid()));
create policy organizations_admin_all on organizations for all using (is_admin()) with check (is_admin());

create policy org_members_read on organization_members for select using (
  user_id = auth.uid() or is_org_manager(organization_id) or is_admin());
create policy org_members_manager_invite on organization_members for insert with check (
  is_org_manager(organization_id) or is_admin());
create policy org_members_admin_all on organization_members for all using (is_admin()) with check (is_admin());

create policy license_packs_read on license_packs for select using (is_org_manager(organization_id) or is_admin());
create policy license_packs_admin_all on license_packs for all using (is_admin()) with check (is_admin());

create policy license_allocations_read on license_allocations for select using (
  user_id = auth.uid() or is_admin()
  or exists (select 1 from license_packs p where p.id = license_pack_id and is_org_manager(p.organization_id)));
create policy license_allocations_admin_all on license_allocations for all using (is_admin()) with check (is_admin());

-- ───────── Learning activity (own rows) ─────────
create policy enrollments_own on enrollments for select using (user_id = auth.uid() or is_admin());
create policy lesson_progress_own_read on lesson_progress for select using (user_id = auth.uid() or is_admin());
create policy lesson_progress_own_write on lesson_progress for insert with check (user_id = auth.uid() and can_view_lesson(lesson_id));
create policy lesson_progress_own_update on lesson_progress for update using (user_id = auth.uid()) with check (user_id = auth.uid() and can_view_lesson(lesson_id));
create policy learner_progress_own on learner_progress for select using (user_id = auth.uid() or is_admin());

-- Org managers: progress of members of their organizations only (data minimisation: progress, not submissions).
create policy learner_progress_org_manager on learner_progress for select using (
  exists (select 1 from organization_members m
          join organization_members mgr on mgr.organization_id = m.organization_id
          where m.user_id = learner_progress.user_id and mgr.user_id = auth.uid() and mgr.role = 'manager'));

create policy quizzes_read on quizzes for select using (has_active_entitlement(course_id) or is_admin());
create policy quizzes_admin_all on quizzes for all using (is_admin()) with check (is_admin());
create policy quiz_questions_read on quiz_questions for select using (
  exists (select 1 from quizzes q where q.id = quiz_id and (has_active_entitlement(q.course_id) or is_admin())));
create policy quiz_questions_admin_all on quiz_questions for all using (is_admin()) with check (is_admin());
-- quiz_options holds correct answers: admin only. Learners get options via a server route that strips is_correct.
create policy quiz_options_admin_all on quiz_options for all using (is_admin()) with check (is_admin());
-- Attempts are inserted by the server (objective grading happens server-side).
create policy quiz_attempts_own_read on quiz_attempts for select using (user_id = auth.uid() or is_admin());

create policy assignments_read on assignments for select using (has_active_entitlement(course_id) or is_admin());
create policy assignments_admin_all on assignments for all using (is_admin()) with check (is_admin());
create policy submissions_own_read on assignment_submissions for select using (user_id = auth.uid() or is_admin());
create policy submissions_own_insert on assignment_submissions for insert with check (
  user_id = auth.uid() and status = 'submitted' and instructor_feedback is null);
create policy submissions_admin_update on assignment_submissions for update using (is_admin()) with check (is_admin());

create policy attestations_own_read on attestations for select using (user_id = auth.uid() or is_admin());
-- Verification by code goes through a server route that returns minimal data.

-- ───────── CMS ─────────
create policy pages_public_read on pages for select using (status = 'published' or is_admin());
create policy pages_admin_all on pages for all using (is_admin()) with check (is_admin());
create policy page_sections_public_read on page_sections for select using (
  exists (select 1 from pages p where p.id = page_id and (p.status = 'published' or is_admin())));
create policy page_sections_admin_all on page_sections for all using (is_admin()) with check (is_admin());
create policy blog_public_read on blog_posts for select using (status = 'published' or is_admin());
create policy blog_admin_all on blog_posts for all using (is_admin()) with check (is_admin());
create policy testimonials_public_read on testimonials for select using (status = 'published' or is_admin());
create policy testimonials_admin_all on testimonials for all using (is_admin()) with check (is_admin());
create policy faq_public_read on faq_items for select using (status = 'published' or is_admin());
create policy faq_admin_all on faq_items for all using (is_admin()) with check (is_admin());
create policy media_public_read on media_assets for select using (true);
create policy media_admin_all on media_assets for all using (is_admin()) with check (is_admin());

-- ───────── Operations ─────────
create policy consent_own_read on consent_records for select using (user_id = auth.uid() or is_admin());
create policy consent_insert on consent_records for insert with check (user_id is null or user_id = auth.uid());
create policy system_settings_admin_all on system_settings for all using (is_admin()) with check (is_admin());
