-- TRAIL Academy — core schema (Phase A)
-- Conventions: UUID primary keys, timestamptz audit columns, snake_case, money in integer euro cents.

create extension if not exists pgcrypto;

-- ───────── Enums ─────────
create type app_role as enum ('learner', 'enterprise_manager', 'admin');
create type course_status as enum ('draft', 'coming_soon', 'published', 'archived');
create type difficulty_level as enum ('beginner', 'intermediate', 'advanced');
create type order_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed', 'canceled');
create type entitlement_status as enum ('active', 'revoked', 'expired');
create type product_kind as enum ('course', 'path', 'bundle', 'enterprise_pack');
create type quiz_question_type as enum ('single_choice', 'multiple_choice', 'free_text');
create type submission_status as enum ('submitted', 'in_review', 'accepted', 'revision_requested');
create type content_status as enum ('draft', 'published');

-- ───────── Utility ─────────
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────── Identity ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  deletion_requested_at timestamptz,
  export_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Create profile + default learner role when an auth user is created.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name) values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  insert into user_roles (user_id, role) values (new.id, 'learner');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ───────── Learning structure ─────────
create table learning_phases (
  id smallint primary key,
  slug text not null unique,
  title text not null,
  summary text not null
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- M1..M18
  slug text not null unique,
  title text not null,
  summary text not null,
  phase_id smallint not null references learning_phases(id),
  position smallint not null unique,         -- recommended learning order
  status course_status not null default 'coming_soon',
  difficulty difficulty_level not null,
  duration_hours numeric(4,1) not null check (duration_hours > 0),
  topics text[] not null default '{}',
  tools text[] not null default '{}',
  outcomes text[] not null default '{}',
  deliverable text,
  is_mvp_slot boolean not null default false,
  completion_rules jsonb not null default '{"requireAllLessons": true, "quizPassPercent": 70, "requireAssignments": true}',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger courses_updated before update on courses for each row execute function set_updated_at();

create table course_prerequisites (
  course_id uuid not null references courses(id) on delete cascade,
  prerequisite_id uuid not null references courses(id) on delete restrict,
  primary key (course_id, prerequisite_id),
  check (course_id <> prerequisite_id)
);

create table learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tagline text,
  audience text,
  is_bundle boolean not null default false,  -- AI Mastery
  access_months smallint not null check (access_months > 0),
  status course_status not null default 'coming_soon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger learning_paths_updated before update on learning_paths for each row execute function set_updated_at();

create table learning_path_courses (
  path_id uuid not null references learning_paths(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  position smallint not null,
  primary key (path_id, course_id)
);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  position smallint not null,
  unique (course_id, position) deferrable initially deferred
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  kind text not null default 'video' check (kind in ('video', 'reading', 'exercise', 'demo')),
  position smallint not null,
  is_free_preview boolean not null default false,
  required boolean not null default true,
  video_provider text,                       -- 'mux' | 'cloudflare_stream'
  video_asset_id text,                       -- never a permanent public URL; playback is signed server-side
  duration_seconds integer check (duration_seconds >= 0),
  transcript text,
  body_md text,
  content_status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, position) deferrable initially deferred
);
create trigger lessons_updated before update on lessons for each row execute function set_updated_at();
create index lessons_course_idx on lessons(course_id);

create table lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null,
  storage_path text not null,                -- private bucket path, served via signed URL
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0)
);

-- ───────── Commerce ─────────
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind product_kind not null,
  title text not null,
  course_id uuid references courses(id),
  path_id uuid references learning_paths(id),
  access_months smallint check (access_months > 0),
  seats smallint check (seats > 0),
  active boolean not null default true,
  stripe_product_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'course') = (course_id is not null)),
  check (kind not in ('path', 'bundle') or path_id is not null)
);
create trigger products_updated before update on products for each row execute function set_updated_at();

create table product_course_access (
  product_id uuid not null references products(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  primary key (product_id, course_id)
);

create table prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  amount_cents integer check (amount_cents >= 0),   -- null = quotation
  currency char(3) not null default 'EUR',
  tax_inclusive boolean not null default true,
  active boolean not null default true,
  stripe_price_id text unique,
  created_at timestamptz not null default now()
);
create unique index prices_one_active_per_product on prices(product_id) where active;

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  stripe_coupon_id text unique,
  percent_off numeric(5,2) check (percent_off > 0 and percent_off <= 100),
  amount_off_cents integer check (amount_off_cents > 0),
  valid_until timestamptz,
  max_redemptions integer,
  active boolean not null default true,
  check ((percent_off is null) <> (amount_off_cents is null))
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status order_status not null default 'pending',
  currency char(3) not null default 'EUR',
  total_cents integer not null check (total_cents >= 0),
  tax_cents integer not null default 0,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated before update on orders for each row execute function set_updated_at();
create index orders_user_idx on orders(user_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  product_id uuid not null references products(id),
  quantity smallint not null default 1 check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  access_months smallint not null check (access_months > 0)   -- snapshot: later catalog edits never alter past orders
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  stripe_payment_intent_id text,
  stripe_charge_id text unique,
  amount_cents integer not null,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  status text not null,
  created_at timestamptz not null default now()
);

create table processed_webhook_events (
  stripe_event_id text primary key,          -- idempotency key
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- Entitlements: one row per (user, course). Granting again extends expiry, never duplicates.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'learner' check (role in ('manager', 'learner')),
  invited_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table license_packs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id),
  seats smallint not null check (seats > 0),
  valid_from date not null default current_date,
  valid_until date not null,
  check (valid_until > valid_from)
);

create table license_allocations (
  id uuid primary key default gen_random_uuid(),
  license_pack_id uuid not null references license_packs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid references learning_paths(id),
  created_at timestamptz not null default now(),
  unique (license_pack_id, user_id)
);

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id),
  status entitlement_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  order_item_id uuid references order_items(id),
  license_allocation_id uuid references license_allocations(id),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index entitlements_user_idx on entitlements(user_id);

-- ───────── Learning activity ─────────
create table enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_lesson_id uuid references lessons(id),
  primary key (user_id, course_id)
);

create table lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table learner_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id),
  percent smallint not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  pass_percent smallint not null default 70 check (pass_percent between 1 and 100),
  max_attempts smallint check (max_attempts > 0)
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  kind quiz_question_type not null,
  prompt text not null,
  feedback text,
  points smallint not null default 1 check (points > 0),
  position smallint not null
);

create table quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,   -- never readable by learners directly (see RLS)
  position smallint not null
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  score_percent numeric(5,2) not null check (score_percent between 0 and 100),
  passed boolean not null,
  submitted_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on quiz_attempts(user_id, quiz_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  instructions_md text not null,
  required boolean not null default true
);

create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text,
  storage_path text,                          -- private bucket
  status submission_status not null default 'submitted',
  instructor_feedback text,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now()
);

create table attestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id),
  verification_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ───────── CMS ─────────
create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  seo_title text,
  seo_description text,
  status content_status not null default 'draft',
  requires_legal_review boolean not null default false,
  updated_at timestamptz not null default now()
);

create table page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  key text not null,
  content jsonb not null default '{}',
  position smallint not null,
  unique (page_id, key)
);

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_md text not null default '',
  category text,
  related_course_ids uuid[] not null default '{}',
  seo_title text,
  seo_description text,
  status content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text,
  quote text not null,
  verified_at timestamptz,                     -- only verified, consented testimonials may be published
  consent_reference text,
  status content_status not null default 'draft',
  check (status = 'draft' or (verified_at is not null and consent_reference is not null))
);

create table faq_items (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',        -- 'global' or a course slug
  question text not null,
  answer text not null,
  position smallint not null default 0,
  status content_status not null default 'published'
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text text,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- ───────── Operations ─────────
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  template text not null,
  provider_message_id text,
  status text not null,
  created_at timestamptz not null default now()
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  purpose text not null,                       -- 'analytics' | 'newsletter' | 'terms'
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create table system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Audit log is append-only.
create function audit_logs_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
create trigger audit_logs_no_update before update or delete on audit_logs for each row execute function audit_logs_immutable();

-- ───────── Access provisioning (transaction-safe, idempotent) ─────────
-- Grants or extends entitlements for all courses covered by an order. Safe to call twice.
create function provision_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  r record;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order % not found', p_order_id; end if;
  if v_order.status <> 'paid' then raise exception 'order % is not paid', p_order_id; end if;

  for r in
    select oi.id as item_id, oi.access_months, pca.course_id
    from order_items oi
    join product_course_access pca on pca.product_id = oi.product_id
    where oi.order_id = p_order_id
  loop
    insert into entitlements (user_id, course_id, expires_at, order_item_id)
    values (v_order.user_id, r.course_id, now() + make_interval(months => r.access_months), r.item_id)
    on conflict (user_id, course_id) do update
      set expires_at = greatest(entitlements.expires_at, excluded.expires_at),
          status = 'active',
          order_item_id = excluded.order_item_id;
  end loop;
end $$;
revoke all on function provision_order(uuid) from public, anon, authenticated;
grant execute on function provision_order(uuid) to service_role;
