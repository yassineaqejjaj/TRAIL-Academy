# Architecture

Single Next.js 16 (App Router, Turbopack) application; no microservices. Verified versions at scaffold time: Next 16.4.2, React 19.3, Tailwind 4, Supabase JS 2.x + `@supabase/ssr`, Zod 4, Stripe SDK 23, Vitest 5.

```
src/app/        routes (server components by default; client only for forms/theme/advisor)
src/components/ design system (ui/), layout, cards
src/lib/catalog structured catalog data + pure helpers (source of seed data)
src/lib/advisor deterministic rules + engine (no LLM)
src/lib/supabase browser-safe server client; service-role client (server-only)
src/proxy.ts    Next 16 "proxy" (ex-middleware): session refresh + optimistic redirect only
supabase/       migrations/ (schema, RLS), seed.sql (generated)
```

## Decisions
- **Catalog is data, not UI.** `catalog/data.ts` drives public pages and generates `seed.sql`, so they cannot drift. The admin UI (Phase D) will edit the DB; until then the public pages read the TS data.
- **Authorization in three layers:** proxy (optimistic) → server code (`requireUser`/`requireAdmin`) → Postgres RLS. The proxy is never the security boundary.
- **Purchasability is explicit:** only `published` courses can be bought (`isPurchasable`); all 18 start `coming_soon`.
- **Access provisioning** is a single SQL function `provision_order()` (security definer, service role only, idempotent, refuses unpaid orders). Stripe webhooks (Phase C) will call it.
- **Money** is integer euro cents; prices live in `prices`, separate from payment records (`orders`, `payments`). Order items snapshot price and access duration.
- `cacheComponents` is off; pages are static or dynamic by default Next rules. Private pages are `force-dynamic`.
