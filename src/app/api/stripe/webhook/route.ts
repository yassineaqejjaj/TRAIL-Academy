import { NextResponse } from "next/server";
import { notifyAfterEvent } from "@/lib/commerce/notify";
import { getStripe } from "@/lib/stripe/client";
import { handleStripeWebhook, type ProcessResult } from "@/lib/stripe/webhook";
import { asService } from "@/lib/db";

export async function POST(request: Request) {
  // The signature covers the exact raw bytes: read text, never parsed JSON.
  const rawBody = await request.text();
  let stripe: ReturnType<typeof getStripe>;
  try { stripe = getStripe(); } catch { return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 }); }

  const { status, body } = await handleStripeWebhook(
    { rawBody, signature: request.headers.get("stripe-signature"), secret: process.env.STRIPE_WEBHOOK_SECRET },
    {
      constructEvent: (raw, sig, secret) => stripe.webhooks.constructEvent(raw, sig, secret),
      processEvent: async (id, e) => {
        // One transaction: the idempotency record and every effect commit together or not at all.
        const row = await asService((q) => q.one<{ r: ProcessResult }>("select process_stripe_event($1, $2, $3::jsonb) as r", [id, e.type, JSON.stringify(e.data)]));
        return row!.r;
      },
      afterProcessed: (result, type) => notifyAfterEvent(result, type),
    },
  );
  return NextResponse.json(body, { status });
}
