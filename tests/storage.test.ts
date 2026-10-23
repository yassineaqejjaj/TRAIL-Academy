// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { isOwnSubmissionKey, isResourceKeyFor, resourceKey, submissionKey } from "@/lib/uploads";

describe("object keys", () => {
  it("namespace by owner and scope, with sanitised names", () => {
    expect(submissionKey("u1", "a1", "../Mon livrable.pdf", "abc")).toBe("submissions/u1/a1/abc-Mon-livrable.pdf");
    expect(resourceKey("l1", "Guide é.pdf", "abc")).toMatch(/^resources\/l1\/abc-[\w-]+\.pdf$/);
  });
  it("only accept keys inside the caller's own scope", () => {
    expect(isOwnSubmissionKey("submissions/u1/a1/f.pdf", "u1", "a1")).toBe(true);
    expect(isOwnSubmissionKey("submissions/u2/a1/f.pdf", "u1", "a1")).toBe(false);
    expect(isOwnSubmissionKey("submissions/u1/a2/f.pdf", "u1", "a1")).toBe(false);
    expect(isOwnSubmissionKey("submissions/u1/a1/../../u2/a1/f.pdf", "u1", "a1")).toBe(false);
    expect(isResourceKeyFor("resources/l1/x.pdf", "l1")).toBe(true);
    expect(isResourceKeyFor("resources/l2/x.pdf", "l1")).toBe(false);
  });
});

describe("presigned URLs (offline signing)", () => {
  let storage: typeof import("@/lib/storage");
  beforeAll(async () => {
    Object.assign(process.env, { S3_ENDPOINT: "http://minio.internal:9000", S3_PUBLIC_ENDPOINT: "https://files.example.com", S3_BUCKET: "trail", S3_ACCESS_KEY_ID: "AKIATEST", S3_SECRET_ACCESS_KEY: "secret" });
    storage = await import("@/lib/storage");
  });

  it("issues an upload form that the bucket will only accept within the size and type limits", async () => {
    const post = await storage.presignUpload({ key: "submissions/u1/a1/f.pdf", contentType: "application/pdf", maxBytes: 10_485_760 });
    expect(post.url).toContain("files.example.com");
    const policy = JSON.parse(Buffer.from(post.fields.Policy, "base64").toString());
    expect(policy.conditions).toEqual(expect.arrayContaining([["content-length-range", 1, 10_485_760], ["eq", "$Content-Type", "application/pdf"], ["eq", "$key", "submissions/u1/a1/f.pdf"]]));
    expect(new Date(policy.expiration).getTime() - Date.now()).toBeLessThan(310_000);
  });

  it("issues short-lived download links with a forced filename", async () => {
    const url = new URL(await storage.presignDownload({ key: "resources/l1/f.pdf", filename: 'guide "pro".pdf', ttlSeconds: 60 }));
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    expect(url.searchParams.get("response-content-disposition")).toBe('attachment; filename="guide _pro_.pdf"');
  });

  it("reports unconfigured storage instead of failing silently", async () => {
    const saved = process.env.S3_BUCKET;
    delete process.env.S3_BUCKET;
    expect(storage.storageConfigured()).toBe(false);
    await expect(storage.presignDownload({ key: "x" })).rejects.toThrow("storage_not_configured");
    process.env.S3_BUCKET = saved;
  });
});
