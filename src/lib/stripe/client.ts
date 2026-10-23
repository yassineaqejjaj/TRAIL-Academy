import "server-only";
import Stripe from "stripe";
import { stripeMode } from "./guard";

let client: Stripe | undefined;

/** Throws unless a test key (or an explicitly unlocked live key) is configured. */
export function getStripe(): Stripe {
  const mode = stripeMode(process.env);
  if (!mode.ok) throw new Error(`stripe_${mode.reason}`);
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
}
