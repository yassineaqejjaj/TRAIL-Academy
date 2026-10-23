-- TRAIL Academy — video pipeline.
-- The instructor uploads a source video from the admin straight to the private bucket; a worker (services/video-worker, ffmpeg)
-- turns it into adaptive HLS under video/<asset id>/ and, once ready, attaches it to the lesson. The queue is this table.

create type video_status as enum ('uploaded', 'processing', 'ready', 'failed');

create table video_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  source_key text not null,
  status video_status not null default 'uploaded',
  attempts integer not null default 0,
  locked_at timestamptz,
  error text,
  duration_seconds integer,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index video_assets_queue_idx on video_assets (status, created_at);
create index video_assets_lesson_idx on video_assets (lesson_id, created_at desc);
create trigger video_assets_updated before update on video_assets for each row execute function set_updated_at();

alter table video_assets enable row level security;
create policy video_assets_admin_read on video_assets for select using (is_admin());

-- Admin: queue a source file that was uploaded under video-src/<lesson id>/.
create function admin_register_video(p_lesson uuid, p_source_key text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  perform require_admin();
  if not exists (select 1 from lessons where id = p_lesson) then raise exception 'unknown_lesson'; end if;
  if p_source_key not like 'video-src/' || p_lesson || '/%' or p_source_key like '%..%' then raise exception 'invalid_source_key'; end if;
  insert into video_assets (lesson_id, source_key, created_by) values (p_lesson, p_source_key, auth.uid()) returning id into v_id;
  perform log_admin_action('video.queued', 'lesson', p_lesson::text, jsonb_build_object('asset', v_id));
  return v_id;
end $$;

-- Admin: put a failed asset back in the queue.
create function admin_retry_video(p_asset uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform require_admin();
  update video_assets set status = 'uploaded', attempts = 0, error = null, locked_at = null where id = p_asset and status = 'failed';
  if not found then raise exception 'not_retryable'; end if;
  perform log_admin_action('video.retried', 'video_asset', p_asset::text);
end $$;

-- Worker: takes the oldest job. Concurrent workers never take the same one (SKIP LOCKED); a job abandoned
-- for more than 30 minutes is taken again, and after 3 attempts it is marked failed instead.
create function claim_video_job() returns table (id uuid, lesson_id uuid, source_key text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  update video_assets set status = 'failed', error = coalesce(error, 'abandoned after 3 attempts')
    where status = 'processing' and locked_at < now() - interval '30 minutes' and attempts >= 3;
  select a.id into v_id from video_assets a
    where (a.status = 'uploaded' or (a.status = 'processing' and a.locked_at < now() - interval '30 minutes')) and a.attempts < 3
    order by a.created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  return query update video_assets a set status = 'processing', locked_at = now(), attempts = a.attempts + 1, error = null
    where a.id = v_id returning a.id, a.lesson_id, a.source_key;
end $$;

-- Worker: records the outcome. A ready asset becomes the lesson's HLS video (the asset id is the folder under video/).
create function finish_video_job(p_asset uuid, p_ok boolean, p_duration integer default null, p_error text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lesson uuid;
begin
  if p_ok then
    update video_assets set status = 'ready', duration_seconds = p_duration, locked_at = null, error = null where id = p_asset and status = 'processing' returning lesson_id into v_lesson;
    if v_lesson is null then raise exception 'unknown_or_not_processing'; end if;
    update lessons set video_provider = 'hls', video_asset_id = p_asset::text, duration_seconds = coalesce(p_duration, duration_seconds) where id = v_lesson;
  else
    update video_assets set status = 'failed', locked_at = null, error = left(coalesce(p_error, 'unknown error'), 500) where id = p_asset and status = 'processing';
  end if;
end $$;

revoke all on function admin_register_video(uuid, text), admin_retry_video(uuid), claim_video_job(), finish_video_job(uuid, boolean, integer, text) from public, anon;
grant execute on function admin_register_video(uuid, text), admin_retry_video(uuid) to authenticated;
grant execute on function claim_video_job(), finish_video_job(uuid, boolean, integer, text) to service_role;
