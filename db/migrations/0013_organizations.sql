-- Enterprise: organisations with managers, private single-use invitations, seat licences and a progress report.
--
-- Privacy by design: a manager sees only what the learner agreed to share when accepting the invitation
-- (progress percentage per module, whether the quiz was passed, last activity). Never answers, notes, submissions or
-- feedback. A member can stop sharing at any time (leave_organization), which also ends their access to the organisation's seats.

alter table organization_members add column accepted_at timestamptz;
update organization_members set accepted_at = invited_at where accepted_at is null;   -- rows that predate this migration

alter table license_allocations add column released_at timestamptz;

create table organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('manager', 'learner')),
  label text not null check (char_length(label) between 2 and 120),   -- internal note: who is invited
  token_hash text not null unique,                                     -- sha256 of the private link token; shown once
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table organization_invitations enable row level security;
create policy org_invitations_read on organization_invitations for select using (is_org_manager(organization_id) or is_admin());

-- A manager only sees progress of members who accepted (consent), replacing the earlier policy.
drop policy learner_progress_org_manager on learner_progress;
create policy learner_progress_org_manager on learner_progress for select using (
  exists (select 1 from organization_members m
          join organization_members mgr on mgr.organization_id = m.organization_id
          where m.user_id = learner_progress.user_id and m.accepted_at is not null
            and mgr.user_id = auth.uid() and mgr.role = 'manager' and mgr.accepted_at is not null));

create or replace function is_org_manager(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members
                 where organization_id = p_org and user_id = auth.uid() and role = 'manager' and accepted_at is not null)
$$;

-- ───────── Admin ─────────
create function admin_create_organization(p_name text, p_billing_email text default null) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  perform require_admin();
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'name_required'; end if;
  insert into organizations (name, billing_email) values (btrim(p_name), nullif(btrim(coalesce(p_billing_email, '')), '')) returning id into v_id;
  perform log_admin_action('organization.created', 'organization', v_id::text);
  return v_id;
end $$;

create function admin_create_license_pack(p_org uuid, p_seats integer, p_valid_until date, p_product uuid default null) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  perform require_admin();
  if p_seats < 1 or p_seats > 5000 then raise exception 'invalid_seats'; end if;
  if p_valid_until <= current_date then raise exception 'invalid_date'; end if;
  insert into license_packs (organization_id, product_id, seats, valid_until) values (p_org, p_product, p_seats, p_valid_until) returning id into v_id;
  perform log_admin_action('license_pack.created', 'license_pack', v_id::text);
  return v_id;
end $$;

-- ───────── Invitations (private single-use link; the token is returned once, only its hash is stored) ─────────
create function create_org_invitation(p_org uuid, p_role text, p_label text, p_days integer default 14) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_token text := encode(gen_random_bytes(18), 'hex');
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_role not in ('manager', 'learner') then raise exception 'invalid_role'; end if;
  if p_role = 'manager' and not is_admin() then raise exception 'admin only'; end if;
  if not (is_admin() or is_org_manager(p_org)) then raise exception 'manager only'; end if;
  if p_days < 1 or p_days > 60 then raise exception 'invalid_days'; end if;
  if char_length(btrim(coalesce(p_label, ''))) < 2 then raise exception 'label_required'; end if;
  insert into organization_invitations (organization_id, role, label, token_hash, expires_at, created_by)
    values (p_org, p_role, btrim(p_label), encode(digest(v_token, 'sha256'), 'hex'), now() + make_interval(days => p_days), auth.uid());
  return v_token;
end $$;

-- Shown on the acceptance page (service role).
create function org_invitation_info(p_token text) returns table (organization_name text, role text)
language sql stable security definer set search_path = public, pg_temp as $$
  select o.name, i.role from organization_invitations i join organizations o on o.id = i.organization_id
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex') and i.used_at is null and i.expires_at > now()
$$;

-- The signed-in person accepts: membership is created and the consent to share progress is recorded.
create function accept_org_invitation(p_token text, p_consent boolean) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inv organization_invitations;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not coalesce(p_consent, false) then raise exception 'consent_required'; end if;
  select * into v_inv from organization_invitations
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and used_at is null and expires_at > now() for update;
  if not found then raise exception 'invitation_invalid'; end if;
  insert into organization_members (organization_id, user_id, role, accepted_at) values (v_inv.organization_id, auth.uid(), v_inv.role, now())
    on conflict (organization_id, user_id) do update set accepted_at = now(), role = case when excluded.role = 'manager' then 'manager' else organization_members.role end;
  update organization_invitations set used_at = now(), used_by = auth.uid() where id = v_inv.id;
  insert into consent_records (user_id, purpose, granted, policy_version) values (auth.uid(), 'organization_progress_sharing', true, '2026-10');
  return v_inv.organization_id;
end $$;

-- A member stops sharing at any time: membership ends and seats given by the organisation are released.
create function leave_organization(p_org uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update entitlements set status = 'revoked'
    where user_id = auth.uid() and license_allocation_id in (select a.id from license_allocations a join license_packs p on p.id = a.license_pack_id where p.organization_id = p_org);
  update license_allocations set released_at = now()
    where user_id = auth.uid() and released_at is null and license_pack_id in (select id from license_packs where organization_id = p_org);
  delete from organization_members where organization_id = p_org and user_id = auth.uid();
  insert into consent_records (user_id, purpose, granted, policy_version) values (auth.uid(), 'organization_progress_sharing', false, '2026-10');
end $$;

-- ───────── Seats ─────────
create function allocate_license_seat(p_pack uuid, p_user uuid, p_path uuid default null) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare pk license_packs; v_path uuid; v_alloc uuid; v_used integer; v_prod_path uuid;
begin
  select * into pk from license_packs where id = p_pack for update;
  if not found then raise exception 'pack_not_found'; end if;
  if not (is_admin() or is_org_manager(pk.organization_id)) then raise exception 'manager only'; end if;
  if pk.valid_from > current_date or pk.valid_until <= current_date then raise exception 'pack_not_valid'; end if;
  if not exists (select 1 from organization_members where organization_id = pk.organization_id and user_id = p_user and accepted_at is not null) then
    raise exception 'not_a_member';
  end if;
  select path_id into v_prod_path from products where id = pk.product_id;
  v_path := coalesce(v_prod_path, p_path);
  if v_path is null then raise exception 'path_required'; end if;
  if v_prod_path is not null and p_path is not null and p_path <> v_prod_path then raise exception 'path_not_in_pack'; end if;
  if exists (select 1 from license_allocations where license_pack_id = p_pack and user_id = p_user and released_at is null) then raise exception 'already_allocated'; end if;
  select count(*) into v_used from license_allocations where license_pack_id = p_pack and released_at is null;
  if v_used >= pk.seats then raise exception 'no_seat_left'; end if;

  insert into license_allocations (license_pack_id, user_id, path_id) values (p_pack, p_user, v_path)
    on conflict (license_pack_id, user_id) do update set released_at = null, path_id = excluded.path_id, created_at = now()
    returning id into v_alloc;
  insert into entitlements (user_id, course_id, expires_at, license_allocation_id)
    select p_user, lpc.course_id, (pk.valid_until + 1)::timestamptz, v_alloc from learning_path_courses lpc where lpc.path_id = v_path
    on conflict (user_id, course_id) do update
      set expires_at = greatest(entitlements.expires_at, excluded.expires_at), status = 'active',
          license_allocation_id = coalesce(entitlements.license_allocation_id, excluded.license_allocation_id);
  return v_alloc;
end $$;

create function release_license_seat(p_allocation uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a license_allocations; v_org uuid;
begin
  select * into a from license_allocations where id = p_allocation and released_at is null for update;
  if not found then raise exception 'allocation_not_found'; end if;
  select organization_id into v_org from license_packs where id = a.license_pack_id;
  if not (is_admin() or is_org_manager(v_org)) then raise exception 'manager only'; end if;
  update license_allocations set released_at = now() where id = a.id;
  update entitlements set status = 'revoked' where license_allocation_id = a.id;   -- only access that came from this seat
end $$;

-- ───────── Progress report: the only data a manager can read about members ─────────
create function org_progress_report(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_members jsonb; v_packs jsonb; v_invites jsonb; v_name text;
begin
  if not (is_admin() or is_org_manager(p_org)) then raise exception 'manager only'; end if;
  select name into v_name from organizations where id = p_org;

  select coalesce(jsonb_agg(m order by m->>'name'), '[]'::jsonb) into v_members from (
    select jsonb_build_object(
      'user_id', om.user_id,
      'name', coalesce(nullif(btrim(pr.full_name), ''), split_part(pr.email, '@', 1)),
      'email', pr.email,
      'role', om.role,
      'joined', om.accepted_at,
      'seats', (select coalesce(jsonb_agg(jsonb_build_object('allocation_id', a.id, 'path', lp.title, 'valid_until', p.valid_until)), '[]'::jsonb)
                from license_allocations a join license_packs p on p.id = a.license_pack_id join organizations o on o.id = p.organization_id
                left join learning_paths lp on lp.id = a.path_id
                where a.user_id = om.user_id and a.released_at is null and o.id = p_org),
      'courses', (select coalesce(jsonb_agg(jsonb_build_object(
                      'code', c.code, 'title', c.title, 'percent', coalesce(lprog.percent, 0),
                      'quiz_passed', exists (select 1 from quiz_attempts qa join quizzes q on q.id = qa.quiz_id where qa.user_id = om.user_id and q.course_id = c.id and qa.passed)
                    ) order by c.position), '[]'::jsonb)
                  from entitlements e join courses c on c.id = e.course_id
                  join license_allocations a on a.id = e.license_allocation_id and a.released_at is null
                  join license_packs p on p.id = a.license_pack_id and p.organization_id = p_org
                  left join learner_progress lprog on lprog.user_id = om.user_id and lprog.course_id = c.id
                  where e.user_id = om.user_id and e.status = 'active'),
      'last_activity', (select max(t) from (
                          select max(updated_at) t from learner_progress where user_id = om.user_id
                          union all select max(updated_at) from lesson_progress where user_id = om.user_id) x)
    ) as m
    from organization_members om join profiles pr on pr.id = om.user_id
    where om.organization_id = p_org and om.accepted_at is not null
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'seats', p.seats, 'used', (select count(*) from license_allocations a where a.license_pack_id = p.id and a.released_at is null),
                                                'valid_until', p.valid_until, 'path_id', pp.path_id, 'path', lp.title) order by p.valid_until), '[]'::jsonb)
    into v_packs from license_packs p left join products pp on pp.id = p.product_id left join learning_paths lp on lp.id = pp.path_id where p.organization_id = p_org;

  select coalesce(jsonb_agg(jsonb_build_object('label', i.label, 'role', i.role, 'expires_at', i.expires_at) order by i.created_at), '[]'::jsonb)
    into v_invites from organization_invitations i where i.organization_id = p_org and i.used_at is null and i.expires_at > now();

  return jsonb_build_object('organization', v_name, 'members', v_members, 'packs', v_packs, 'pending_invitations', v_invites);
end $$;

revoke all on function admin_create_organization(text, text), admin_create_license_pack(uuid, integer, date, uuid), create_org_invitation(uuid, text, text, integer),
  org_invitation_info(text), accept_org_invitation(text, boolean), leave_organization(uuid), allocate_license_seat(uuid, uuid, uuid),
  release_license_seat(uuid), org_progress_report(uuid) from public, anon;
grant execute on function admin_create_organization(text, text), admin_create_license_pack(uuid, integer, date, uuid), create_org_invitation(uuid, text, text, integer),
  accept_org_invitation(text, boolean), leave_organization(uuid), allocate_license_seat(uuid, uuid, uuid), release_license_seat(uuid), org_progress_report(uuid) to authenticated;
grant execute on function org_invitation_info(text) to service_role;
