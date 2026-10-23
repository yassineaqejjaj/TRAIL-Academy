import type Stripe from "stripe";
import { normalizeStripeEvent, type NormalizedEvent } from "./events";

export interface ProcessResult { status: string; order_id?: string; user_id?: string; newly_paid?: boolean }

export interface WebhookDeps {
  constructEvent: (rawBody: string, signature: string, secret: string) => Stripe.Event;
  /** Calls the atomic, idempotent database function. Must throw on failure so Stripe retries. */
  processEvent: (id: string, e: NormalizedEvent) => Promise<ProcessResult>;
  /** Best-effort side effects (emails). Failures never fail the webhook. */
  afterProcessed: (result: ProcessResult, type: string) => Promise<void>;
}

/**
 * Order of operations matters: verify signature on the RAW body → normalise → apply atomically → notify.
 * Nothing is granted from client redirects; only this path provisions paid access.
 */
export async function handleStripeWebhook(input: { rawBody: string; signature: string | null; secret: string | undefined }, deps: WebhookDeps): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!input.secret) return { status: 503, body: { error: "webhook_not_configured" } };
  if (!input.signature) return { status: 400, body: { error: "missing_signature" } };

  let event: Stripe.Event;
  try { event = deps.constructEvent(input.rawBody, input.signature, input.secret); }
  catch { return { status: 400, body: { error: "invalid_signature" } }; }

  const normalized = normalizeStripeEvent(event);
  if (!normalized) return { status: 200, body: { received: true, ignored: event.type } };

  let result: ProcessResult;
  try { result = await deps.processEvent(event.id, normalized); }
  catch { return { status: 500, body: { error: "processing_failed" } }; } // Stripe will retry; nothing was recorded

  try { await deps.afterProcessed(result, event.type); } catch { /* emails are best effort */ }
  return { status: 200, body: { received: true, status: result.status } };
}
