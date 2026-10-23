import "server-only";
import { signMuxToken } from "./signing";

export type PlaybackResult =
  | { kind: "hls"; url: string; expiresInSeconds: number }
  | { kind: "unavailable"; reason: "no_video" | "provider_not_configured" | "provider_unsupported" };

const TTL = 2 * 60 * 60;

/**
 * Returns a short-lived signed playback URL. Permanent unrestricted URLs are never stored or returned.
 * Only call after the caller's access to the lesson was established (RLS-filtered lesson row).
 * Note: signed URLs deter casual sharing; they cannot absolutely prevent downloading.
 */
export function getPlayback(lesson: { video_provider: string | null; video_asset_id: string | null }): PlaybackResult {
  if (!lesson.video_provider || !lesson.video_asset_id) return { kind: "unavailable", reason: "no_video" };
  if (lesson.video_provider === "mux") {
    const keyId = process.env.MUX_SIGNING_KEY_ID;
    const key = process.env.MUX_SIGNING_PRIVATE_KEY;
    if (!keyId || !key) return { kind: "unavailable", reason: "provider_not_configured" };
    const token = signMuxToken({ playbackId: lesson.video_asset_id, keyId, privateKeyB64: key, ttlSeconds: TTL });
    return { kind: "hls", url: `https://stream.mux.com/${lesson.video_asset_id}.m3u8?token=${token}`, expiresInSeconds: TTL };
  }
  return { kind: "unavailable", reason: "provider_unsupported" };
}
