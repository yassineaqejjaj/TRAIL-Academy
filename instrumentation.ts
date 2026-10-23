import type { Instrumentation } from "next";

/** One JSON line per server error (stdout is collected by Vercel and Railway). No request bodies, cookies or query strings. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as { message?: string; digest?: string };
  console.error(JSON.stringify({
    level: "error", msg: "request_error", message: e?.message ?? String(err), digest: e?.digest,
    method: request.method, path: request.path.split("?")[0], route: context.routePath, routeType: context.routeType,
  }));
};
