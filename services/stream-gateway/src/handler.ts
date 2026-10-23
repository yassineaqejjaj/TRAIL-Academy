import type { Readable } from "node:stream";

/** Pure request handler (no network): easy to test; server.ts wires it to Node http and S3. */
export interface ObjectResult { stream: Readable; contentLength?: number; contentRange?: string }

export interface Deps {
  verify(token: string): Promise<{ assetId: string } | null>;
  getObject(key: string, range?: string): Promise<ObjectResult | null>;
  getText(key: string): Promise<string | null>;
  allowedOrigin: string;
}

export interface GatewayRequest { method: string; url: string; headers: Record<string, string | string[] | undefined> }
export interface GatewayResponse { status: number; headers: Record<string, string>; text?: string; stream?: Readable }

const CONTENT_TYPES: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl", ts: "video/mp2t", m4s: "video/iso.segment", mp4: "video/mp4", aac: "audio/aac", vtt: "text/vtt",
};
const ROUTE = /^\/v\/([A-Za-z0-9_-]{4,64})\/((?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*)$/;

/** Appends the token to every relative URI of an HLS playlist so segments are authorised too. */
export function rewritePlaylist(text: string, token: string): string {
  const withToken = (uri: string) => (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(uri) || uri.startsWith("/") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`);
  return text.split(/\r?\n/).map((line) => {
    if (line.startsWith("#")) return line.replace(/URI="([^"]*)"/g, (_, u: string) => `URI="${withToken(u)}"`);
    return line.trim() === "" ? line : withToken(line.trim());
  }).join("\n");
}

export function createHandler(deps: Deps) {
  const cors = (): Record<string, string> => ({
    "Access-Control-Allow-Origin": deps.allowedOrigin, "Access-Control-Allow-Headers": "Range", "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    Vary: "Origin", "Cross-Origin-Resource-Policy": "cross-origin", "X-Content-Type-Options": "nosniff",
  });
  const fail = (status: number, message: string): GatewayResponse => ({ status, headers: { ...cors(), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }, text: message });

  return async function handle(req: GatewayRequest): Promise<GatewayResponse> {
    const url = new URL(req.url, "http://gateway.local");
    if (url.pathname === "/healthz") return { status: 200, headers: { "Content-Type": "text/plain" }, text: "ok" };
    if (req.method === "OPTIONS") return { status: 204, headers: { ...cors(), "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "600" } };
    if (req.method !== "GET") return fail(405, "Method not allowed");

    const m = ROUTE.exec(url.pathname);
    if (!m) return fail(404, "Not found");
    const [, assetId, file] = m;
    if (file.split("/").some((s) => s === "." || s === "..")) return fail(404, "Not found");
    const ext = file.split(".").pop()!.toLowerCase();
    if (!CONTENT_TYPES[ext]) return fail(404, "Not found");

    const token = url.searchParams.get("token");
    const claims = token ? await deps.verify(token) : null;
    if (!token || !claims || claims.assetId !== assetId) return fail(403, "Forbidden"); // same answer whether the token is missing, expired or for another video

    const key = `video/${assetId}/${file}`;
    const base = { ...cors(), "Content-Type": CONTENT_TYPES[ext], "X-Robots-Tag": "noindex" };

    if (ext === "m3u8") {
      const text = await deps.getText(key);
      if (text === null) return fail(404, "Not found");
      return { status: 200, headers: { ...base, "Cache-Control": "private, no-store" }, text: rewritePlaylist(text, token) };
    }

    const range = typeof req.headers.range === "string" && /^bytes=\d*-\d*$/.test(req.headers.range) ? req.headers.range : undefined;
    const obj = await deps.getObject(key, range);
    if (!obj) return fail(404, "Not found");
    const headers: Record<string, string> = { ...base, "Cache-Control": "private, max-age=300", "Accept-Ranges": "bytes" };
    if (obj.contentLength !== undefined) headers["Content-Length"] = String(obj.contentLength);
    if (obj.contentRange) headers["Content-Range"] = obj.contentRange;
    return { status: obj.contentRange ? 206 : 200, headers, stream: obj.stream };
  };
}
