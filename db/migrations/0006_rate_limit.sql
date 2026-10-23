-- Shared rate limiting for application endpoints (contact, interest, checkout, uploads, progress, auth server actions).
-- State lives in PostgreSQL so limits hold across serverless instances and restarts; Better Auth keeps its own table (auth.rate_limits).

create table app_rate_limits (
  key text primary key,
  hits integer not null,
  reset_at timestamptz not null
);
alter table app_rate_limits enable row level security; -- no policy: unreachable except through the functions below
revoke all on app_rate_limits from public, anon, authenticated;

-- One atomic upsert per call: counts the hit and tells whether it is still within the limit.
create function hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key) > 200 then raise exception 'invalid_rate_limit'; end if;
  insert into app_rate_limits as r (key, hits, reset_at) values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set hits = case when r.reset_at <= now() then 1 else r.hits + 1 end,
        reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning hits into n;
  return n <= p_limit;
end $$;

-- Housekeeping, called by the daily cron.
create function purge_rate_limits() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  delete from app_rate_limits where reset_at < now() - interval '1 hour';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function hit_rate_limit(text, integer, integer), purge_rate_limits() from public, anon, authenticated;
grant execute on function hit_rate_limit(text, integer, integer), purge_rate_limits() to service_role;
