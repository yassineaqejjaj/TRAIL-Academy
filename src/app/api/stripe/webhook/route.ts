import { NextResponse } from "next/server";
import { notifyAfterEvent } from "@/lib/commerce/notify";
import { getStripe } from "@/lib/stripe/client";
import { handleStripeWebhook, type ProcessResult } from "@/lib/stripe/webhook";
import { createServiceClient } from "@/lib/supabase/admin";

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
        const { data, error } = await createServiceClient().rpc("process_stripe_event", { p_event_id: id, p_type: e.type, p_data: e.data });
        if (error) throw error;
        return data as ProcessResult;
      },
      afterProcessed: (result, type) => notifyAfterEvent(result, type),
    },
  );
  return NextResponse.json(body, { status });
}
