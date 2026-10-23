import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, safeFileName, submissionPath, validateUpload } from "@/lib/uploads";
import { signMuxToken } from "@/lib/video/signing";

describe("validateUpload", () => {
  it("accepts allowed files", () => {
    expect(validateUpload({ name: "Livrable.PDF", size: 1000, type: "application/pdf" })).toEqual({ ok: true, extension: "pdf" });
  });
  it("rejects empty, oversize, unknown and mismatched files", () => {
    expect(validateUpload({ name: "a.pdf", size: 0, type: "application/pdf" }).ok).toBe(false);
    expect(validateUpload({ name: "a.pdf", size: MAX_UPLOAD_BYTES + 1, type: "application/pdf" }).ok).toBe(false);
    expect(validateUpload({ name: "a.exe", size: 10, type: "application/octet-stream" }).ok).toBe(false);
    expect(validateUpload({ name: "a.html", size: 10, type: "text/html" }).ok).toBe(false);
    expect(validateUpload({ name: "a.pdf", size: 10, type: "text/html" }).ok).toBe(false);
    expect(validateUpload({ name: "noextension", size: 10, type: "application/pdf" }).ok).toBe(false);
  });
});

describe("storage paths", () => {
  it("sanitises names and prefixes the user folder", () => {
    expect(safeFileName("../../etc/passwd.pdf")).toBe("etc-passwd.pdf");
    expect(safeFileName("Mon livrable é.docx")).toMatch(/^[\w-]+\.docx$/);
    const p = submissionPath("uid-1", "asg-1", "../x.pdf", "abc");
    expect(p.startsWith("uid-1/asg-1/abc-")).toBe(true);
    expect(p).not.toContain("..");
  });
});

describe("signMuxToken", () => {
  it("produces a verifiable RS256 JWT with expiry and playback id", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const token = signMuxToken({ playbackId: "pb123", keyId: "kid1", privateKeyB64: Buffer.from(pem).toString("base64"), ttlSeconds: 600, now: 1_000_000 });
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toMatchObject({ alg: "RS256", kid: "kid1" });
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({ sub: "pb123", aud: "v", exp: 1000 + 600 });
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });
});
