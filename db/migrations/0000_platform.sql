-- TRAIL Academy — platform prerequisites (plain PostgreSQL, no managed-service dependency)
--
-- * Three NOLOGIN roles model privilege levels. The application connects with ONE login role and
--   switches inside each transaction (`SET LOCAL ROLE`), so Row Level Security applies to user requests:
--     anon          public, unauthenticated reads
--     authenticated a signed-in user; identity is passed via the `app.uid` setting, read by auth.uid()
--     service_role  trusted server code (webhooks, jobs); bypasses RLS
--   The login role must be allowed to create roles (a superuser, as on Railway PostgreSQL).
-- * Schema `auth` holds the tables used by Better Auth (users, sessions, accounts, verifications).
--   They are NOT granted to any of the three roles: only the auth library, connecting as the owner, touches them.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant anon, authenticated, service_role to current_user;

create extension if not exists pgcrypto;
create schema if not exists auth;

-- Identity of the current request, set per transaction by the application (see src/lib/db).
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.uid', true), '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Tables created from now on in `public` get the standard grants; RLS decides what rows are visible.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table auth.sessions (
  id uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id uuid not null references auth.users(id) on delete cascade
);
create index sessions_user_id_idx on auth.sessions(user_id);
create table auth.accounts (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  provider_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_id_idx on auth.accounts(user_id);
create table auth.verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index verifications_identifier_idx on auth.verifications(identifier);

-- Rate limiting state for the auth endpoints lives in the database so it holds across serverless instances.
create table auth.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count integer not null,
  last_request bigint not null
);

alter table auth.rate_limits enable row level security;
alter table auth.users enable row level security;
alter table auth.sessions enable row level security;
alter table auth.accounts enable row level security;
alter table auth.verifications enable row level security;
