import "server-only";
import { signStreamToken } from "./token";

export type PlaybackResult =
  | { kind: "hls"; url: string; expiresInSeconds: number }
  | { kind: "unavailable"; reason: "no_video" | "provider_not_configured" | "provider_unsupported" };

const TTL = 2 * 60 * 60;

/**
 * Self-hosted HLS: segments live in the private bucket under video/<assetId>/ and are served only by the stream
 * gateway to holders of a short-lived signed token. No permanent public URL exists.
 * Call only after the caller's access to the lesson was established (RLS-filtered lesson row).
 * Signed URLs deter casual sharing; they cannot absolutely prevent downloading.
 */
export async function getPlayback(lesson: { video_provider: string | null; video_asset_id: string | null }): Promise<PlaybackResult> {
  if (!lesson.video_provider || !lesson.video_asset_id) return { kind: "unavailable", reason: "no_video" };
  if (lesson.video_provider !== "hls") return { kind: "unavailable", reason: "provider_unsupported" };
  const gateway = process.env.STREAM_GATEWAY_URL;
  const secret = process.env.STREAM_SIGNING_SECRET;
  if (!gateway || !secret) return { kind: "unavailable", reason: "provider_not_configured" };
  const token = await signStreamToken({ assetId: lesson.video_asset_id, secret, ttlSeconds: TTL });
  return { kind: "hls", url: `${gateway.replace(/\/$/, "")}/v/${encodeURIComponent(lesson.video_asset_id)}/index.m3u8?token=${token}`, expiresInSeconds: TTL };
}
