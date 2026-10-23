// @vitest-environment node
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createHandler, rewritePlaylist, type Deps } from "../services/stream-gateway/src/handler.ts";
import { signStreamToken, verifyStreamToken } from "@/lib/video/token";

const SECRET = "s".repeat(40);
const PLAYLIST = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:6.0,\nseg0.ts\n#EXTINF:6.0,\nseg1.ts\nhttps://cdn.example/abs.ts\n#EXT-X-ENDLIST\n';

function gateway(overrides: Partial<Deps> = {}) {
  const calls: string[] = [];
  const deps: Deps = {
    allowedOrigin: "https://academy.example",
    verify: (t) => verifyStreamToken(t, SECRET),
    getObject: async (key, range) => { calls.push(`${key}|${range ?? ""}`); return key.includes("missing") ? null : { stream: Readable.from([Buffer.from("segment")]), contentLength: 7, contentRange: range ? "bytes 0-6/100" : undefined }; },
    getText: async (key) => (key.endsWith("index.m3u8") && !key.includes("missing") ? PLAYLIST : null),
    ...overrides,
  };
  return { handle: createHandler(deps), calls };
}
const get = (path: string, headers: Record<string, string> = {}) => ({ method: "GET", url: path, headers });

describe("stream tokens", () => {
  it("are verifiable by the gateway and bound to one asset", async () => {
    const token = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 60 });
    expect(await verifyStreamToken(token, SECRET)).toEqual({ assetId: "asset-1234" });
    expect(await verifyStreamToken(token, "other".repeat(10))).toBeNull();
    expect(await verifyStreamToken(`${token}x`, SECRET)).toBeNull();
  });
  it("expire", async () => {
    const token = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 60, now: 1_000_000 });
    expect(await verifyStreamToken(token, SECRET, 1_000_000 + 30_000)).not.toBeNull();
    expect(await verifyStreamToken(token, SECRET, 1_000_000 + 120_000)).toBeNull();
  });
});

describe("playlist rewriting", () => {
  it("adds the token to relative segment and key URIs only", () => {
    const out = rewritePlaylist(PLAYLIST, "T");
    expect(out).toContain("seg0.ts?token=T");
    expect(out).toContain('URI="init.mp4?token=T"');
    expect(out).toContain("https://cdn.example/abs.ts\n");
    expect(out).toContain("#EXT-X-ENDLIST");
  });
});

describe("stream gateway", () => {
  it("refuses requests without a valid token, with the same answer for every failure", async () => {
    const { handle, calls } = gateway();
    const other = await signStreamToken({ assetId: "other-asset", secret: SECRET, ttlSeconds: 60 });
    const expired = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 1, now: 1000 });
    for (const q of ["", "?token=garbage", `?token=${other}`, `?token=${expired}`]) {
      const r = await handle(get(`/v/asset-1234/index.m3u8${q}`));
      expect([r.status, r.text]).toEqual([403, "Forbidden"]);
    }
    expect(calls).toHaveLength(0); // storage is never touched without authorisation
  });

  it("serves a playlist with the token propagated to segments, and never caches it", async () => {
    const { handle } = gateway();
    const token = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 60 });
    const r = await handle(get(`/v/asset-1234/index.m3u8?token=${token}`));
    expect(r.status).toBe(200);
    expect(r.headers["Content-Type"]).toBe("application/vnd.apple.mpegurl");
    expect(r.headers["Cache-Control"]).toBe("private, no-store");
    expect(r.text).toContain(`seg0.ts?token=${encodeURIComponent(token)}`);
  });

  it("streams segments, honouring byte ranges", async () => {
    const { handle, calls } = gateway();
    const token = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 60 });
    const full = await handle(get(`/v/asset-1234/seg0.ts?token=${token}`));
    expect(full.status).toBe(200);
    const part = await handle(get(`/v/asset-1234/seg0.ts?token=${token}`, { range: "bytes=0-6" }));
    expect(part.status).toBe(206);
    expect(part.headers["Content-Range"]).toBe("bytes 0-6/100");
    expect(calls[1]).toBe("video/asset-1234/seg0.ts|bytes=0-6");
  });

  it("maps URLs onto bucket keys safely: no traversal, no unknown types, no other prefixes", async () => {
    const { handle, calls } = gateway();
    const token = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 60 });
    for (const p of ["/v/asset-1234/../asset-9999/seg.ts", "/v/asset-1234/%2e%2e/x.ts", "/v/asset-1234/.hidden.ts", "/v/asset-1234/secret.env", "/v/asset-1234/", "/submissions/u/a/f.pdf", "/v/x/seg.ts"]) {
      // The URL parser may normalise "../" onto another asset (then the token no longer matches: 403); everything else is 404.
      expect([403, 404]).toContain((await handle(get(`${p}?token=${token}`))).status);
    }
    expect(calls).toHaveLength(0);
  });

  it("answers 404 for missing objects, CORS preflight for the site origin, and rejects other methods", async () => {
    const { handle } = gateway();
    const token = await signStreamToken({ assetId: "asset-1234", secret: SECRET, ttlSeconds: 60 });
    expect((await handle(get(`/v/asset-1234/missing.ts?token=${token}`))).status).toBe(404);
    const pre = await handle({ method: "OPTIONS", url: "/v/asset-1234/seg.ts", headers: {} });
    expect(pre.status).toBe(204);
    expect(pre.headers["Access-Control-Allow-Origin"]).toBe("https://academy.example");
    expect((await handle({ method: "POST", url: "/v/asset-1234/seg.ts", headers: {} })).status).toBe(405);
    expect((await handle(get("/healthz"))).text).toBe("ok");
  });
});
