import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage (MinIO on Railway by default; any S3 API works).
 * Files never pass through the Next.js server (serverless request bodies are capped): the browser uploads
 * straight to the bucket using a short-lived, size-limited presigned POST that the server issues after checking rights.
 */
export const storageConfigured = (): boolean =>
  Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

const bucket = () => process.env.S3_BUCKET!;

function client(publicFacing = false): S3Client {
  if (!storageConfigured()) throw new Error("storage_not_configured");
  return new S3Client({
    // Browsers must reach the endpoint used in presigned URLs: S3_PUBLIC_ENDPOINT when the internal one is private.
    endpoint: publicFacing ? process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT : process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
}

export async function presignUpload(opts: { key: string; contentType: string; maxBytes: number; ttlSeconds?: number }): Promise<{ url: string; fields: Record<string, string> }> {
  return createPresignedPost(client(true), {
    Bucket: bucket(), Key: opts.key, Expires: opts.ttlSeconds ?? 300,
    Fields: { "Content-Type": opts.contentType },
    // The bucket itself rejects anything outside these bounds.
    Conditions: [["content-length-range", 1, opts.maxBytes], ["eq", "$Content-Type", opts.contentType], ["eq", "$key", opts.key]],
  });
}

export async function presignDownload(opts: { key: string; filename?: string; ttlSeconds?: number }): Promise<string> {
  return getSignedUrl(client(true), new GetObjectCommand({
    Bucket: bucket(), Key: opts.key,
    ResponseContentDisposition: opts.filename ? `attachment; filename="${opts.filename.replace(/["\\\r\n]/g, "_")}"` : undefined,
  }), { expiresIn: opts.ttlSeconds ?? 60 });
}

/** Size/type of an uploaded object, or null when it does not exist. Used to confirm an upload before recording it. */
export async function objectInfo(key: string): Promise<{ size: number; contentType?: string } | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: Number(r.ContentLength ?? 0), contentType: r.ContentType };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })).catch(() => undefined);
}

/** Read-only reachability check used by the admin production-readiness screen. */
export async function storageHealth(): Promise<"ok" | "not_configured" | "unreachable"> {
  if (!storageConfigured()) return "not_configured";
  try { await client().send(new HeadBucketCommand({ Bucket: bucket() })); return "ok"; } catch { return "unreachable"; }
}
