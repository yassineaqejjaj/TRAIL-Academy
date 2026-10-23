# Deployment

Target: Vercel (or Railway) + managed Supabase. **Nothing has been deployed.**

1. Create a Supabase project; apply `supabase/migrations/*.sql` then `supabase/seed.sql` (SQL editor or `supabase db push`). Create the single admin: sign up, then `insert into user_roles values ('<uuid>','admin')` via the service role.
2. Set env vars from `.env.example` in the host. `SUPABASE_SERVICE_ROLE_KEY` and Stripe/Resend keys are server-only.
3. Supabase Auth: set site URL and redirect URL `<site>/auth/callback`; enable email confirmation; optional Google OAuth.
4. Do **not** enable live Stripe keys until legal review of terms of sale, withdrawal rights and professional-training obligations is complete (see SECURITY.md).

Backups: enable Supabase PITR/daily backups; test a restore into a scratch project before launch. Monitoring/error reporting (e.g. Sentry) is not yet wired.

## Stripe (test mode first)
1. Use a **test-mode** account; set `STRIPE_SECRET_KEY` (`sk_test_…`). Keep `ALLOW_LIVE_PAYMENTS=false`.
2. Dashboard → Developers → Webhooks → add `<site>/api/stripe/webhook` with events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Configure the customer portal and (optionally) Stripe Tax in the dashboard; set `STRIPE_AUTOMATIC_TAX=true` once tax registrations are in place.
4. Test with Stripe's published test cards (success, 3DS, decline), refunds and disputes from the dashboard, and replays ("resend event") to confirm idempotency.
5. Set `CRON_SECRET`; `vercel.json` schedules `/api/cron/expire` daily.
6. Prices are sent as inline `price_data` from the database, so editing a price in admin needs no Stripe sync; `products.stripe_product_id`/`prices.stripe_price_id` are reserved for later.
