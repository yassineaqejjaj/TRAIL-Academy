-- Real reviews only. The instructor invites real people (beta testers, learners) with a private single-use link; each person
-- submits their own words with explicit consent; nothing is published until the instructor has checked it is genuine and
-- records how consent was obtained. No review can be created any other way, and none is ever generated.

create table review_invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,               -- sha256 of the private link token; the token itself is shown once
  label text not null check (char_length(label) between 2 and 120),   -- internal note: who is invited
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table review_submissions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references review_invitations(id),
  author_name text not null check (char_length(author_name) between 2 and 80),
  author_role text check (char_length(author_role) <= 120),
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/in/[A-Za-z0-9_%-]+/?$'),
  quote text not null check (char_length(quote) between 40 and 1200),
  consent_publish boolean not null check (consent_publish),   -- explicit consent to publish name, role and text
  consent_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  testimonial_id uuid references testimonials(id),
  created_at timestamptz not null default now()
);

alter table review_invitations enable row level security;
alter table review_submissions enable row level security;
create policy review_invitations_admin on review_invitations for select using (is_admin());
create policy review_submissions_admin on review_submissions for select using (is_admin());

-- Admin: creates a private link. Returns the token once (only its hash is stored).
create function admin_create_review_invitation(p_label text, p_days integer default 30) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_token text := encode(gen_random_bytes(18), 'hex');
begin
  perform require_admin();
  if p_days < 1 or p_days > 180 then raise exception 'invalid_days'; end if;
  insert into review_invitations (token_hash, label, expires_at, created_by)
    values (encode(digest(v_token, 'sha256'), 'hex'), btrim(p_label), now() + make_interval(days => p_days), auth.uid());
  perform log_admin_action('review.invited', 'review_invitation', btrim(p_label));
  return v_token;
end $$;

-- Public form: is this link still usable? (service role, called by the page)
create function review_invitation_open(p_token text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from review_invitations where token_hash = encode(digest(p_token, 'sha256'), 'hex') and used_at is null and expires_at > now())
$$;

-- Public form: one submission per link, only with explicit consent.
create function submit_review(p_token text, p_name text, p_role text, p_linkedin text, p_quote text, p_consent boolean) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inv uuid; v_id uuid;
begin
  if not coalesce(p_consent, false) then raise exception 'consent_required'; end if;
  select id into v_inv from review_invitations
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and used_at is null and expires_at > now() for update;
  if v_inv is null then raise exception 'invitation_invalid'; end if;
  insert into review_submissions (invitation_id, author_name, author_role, linkedin_url, quote, consent_publish)
    values (v_inv, btrim(p_name), nullif(btrim(coalesce(p_role, '')), ''), nullif(btrim(coalesce(p_linkedin, '')), ''), btrim(p_quote), true) returning id into v_id;
  update review_invitations set used_at = now() where id = v_inv;
  return v_id;
end $$;

-- Admin: publishes a submission as a testimonial after checking it is genuine. The reference records how.
create function admin_approve_review(p_submission uuid, p_reference text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare s review_submissions; v_t uuid;
begin
  perform require_admin();
  if char_length(btrim(coalesce(p_reference, ''))) < 5 then raise exception 'reference_required'; end if;
  select * into s from review_submissions where id = p_submission and status = 'pending' for update;
  if not found then raise exception 'not_pending'; end if;
  insert into testimonials (author_name, author_role, quote, verified_at, consent_reference, status)
    values (s.author_name, s.author_role, s.quote, now(), 'Avis soumis via lien privé le ' || to_char(s.consent_at, 'YYYY-MM-DD') || ' avec consentement explicite. Vérification : ' || btrim(p_reference), 'published')
    returning id into v_t;
  update review_submissions set status = 'approved', testimonial_id = v_t where id = s.id;
  perform log_admin_action('review.approved', 'review_submission', s.id::text);
  return v_t;
end $$;

create function admin_reject_review(p_submission uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform require_admin();
  update review_submissions set status = 'rejected' where id = p_submission and status = 'pending';
  if not found then raise exception 'not_pending'; end if;
  perform log_admin_action('review.rejected', 'review_submission', p_submission::text);
end $$;

revoke all on function admin_create_review_invitation(text, integer), review_invitation_open(text), submit_review(text, text, text, text, text, boolean),
  admin_approve_review(uuid, text), admin_reject_review(uuid) from public, anon;
grant execute on function admin_create_review_invitation(text, integer), admin_approve_review(uuid, text), admin_reject_review(uuid) to authenticated;
grant execute on function review_invitation_open(text), submit_review(text, text, text, text, text, boolean) to service_role;
