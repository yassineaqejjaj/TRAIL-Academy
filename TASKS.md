# Task list

## Phase A — product foundation
- [x] Next.js 16 scaffold, Tailwind 4, Vitest, Playwright config
- [x] Design system (tokens, light/dark, core components, skip link, focus states)
- [x] Catalog data: 18 modules, 4 phases, 3 paths/bundle, offers; prerequisites; tested
- [x] Public site: home, catalog (search+filters), course detail, paths, pricing, enterprise (+quote API), instructor placeholder, resources empty state, legal skeletons, advisor, 404, sitemap, robots
- [x] Database schema + RLS + generated seed (verified on PGlite)
- [x] Auth flows (sign in/up/reset/out, callback), protected `/compte`, admin role gate — **unverified against real Supabase**
- [x] Docs set
- [ ] Run Playwright e2e (needs browser download approval)
- [ ] Accessibility automated scan (axe) and Lighthouse
- [ ] Newsletter signup, analytics events + consent banner, Open Graph images, breadcrumbs JSON-LD
- [ ] Google OAuth, account deletion/export requests

## Phase B — learning platform
- [x] Progress, resume, last lesson, percent (DB function, tested)
- [x] Quizzes: single/multiple/free-text, server-side grading, attempts, thresholds, feedback (DB, tested)
- [x] Assignments: written + file submission, validation, private storage, instructor acceptance (DB + upload lib tested)
- [x] Completion rules + attestation issue/verification (DB, tested); printable verification page
- [x] Learner dashboard (`/compte`), course home/resume, lesson player with outline, speed, subtitles, chapters, transcript, notes, bookmarks, resources — **built, not exercised against live Supabase**
- [x] Signed video adapter (Mux) — token format tested locally, **not tested against Mux**
- [ ] Cloudflare Stream adapter; hls.js playback test with a real stream
- [ ] Render lesson Markdown safely; PDF attestation; email on completion
- [ ] Manual review queue for free-text answers (needs Phase D admin)
- [ ] Playwright run of learner workflow with fixture data against a Supabase test project

## Phase C — commerce
- [x] Order creation with purchasability rules and price snapshot (SQL, tested)
- [x] Idempotent atomic webhook processing: paid, async, failed, expired, refunds (full/partial), disputes (tested)
- [x] Signature verification + handler + event normaliser (tested with real Stripe signatures)
- [x] Live-payment guard; checkout, success (display-only), orders, invoice, billing-portal pages — **never run against Stripe**
- [x] Transactional emails (purchase, refund) — **never sent via Resend**
- [x] Entitlement expiry cron endpoint
- [ ] Run the full flow with Stripe test keys + `stripe listen` + test cards; verify tax, promo codes, portal, invoices
- [ ] Failed-payment email, expiry reminder emails
- [ ] Coupon management UI (Phase D); sync coupons/prices with Stripe if desired
- [ ] Legal sign-off on withdrawal-right handling, CGV, professional-training obligations, tax (blocks live checkout)

## Phase D — administration
- [x] Dashboard metrics (net revenue, purchases, refunds, registrations, active learners, enrolments, completions, top products, order funnel, pending reviews)
- [x] Courses: create/edit, prerequisites, completion rules, SEO, chapters/lessons CRUD + reorder, resources, subtitles, quizzes/questions/options, assignments, preview, readiness-gated publish/unpublish (DB-tested)
- [x] Paths (create, edit, ordered modules), products and price history, coupons (Stripe sync best-effort), orders and refund request, learners (grant/revoke with reason), assignment review, audit log
- [x] CMS: hero, instructor profile, FAQ, verified testimonials, articles + SEO + related courses + sitemap, legal texts; public site reads them
- [x] Public catalogue reads the database; markdown rendering is safe
- [x] Design applied: tokens, fonts, header/footer, home, catalogue, course page (with launch-notification sign-up), player, dashboard, admin shell
- [ ] **Run everything against a real Supabase project** (admin screens, uploads, signed downloads)
- [ ] Remaining screens not individually matched to the design (paths, pricing, enterprise, advisor result, auth, legal, checkout pages, quiz, assignment, attestation, admin editors)
- [ ] Enterprise admin, advisor-rules editor, settings/compliance screen, direct video upload, free-text answer review queue, account deletion/export workflows, analytics + consent banner
- [x] Prices aligned with the supplied price grid (Standard/Avancé, paths, Mentored, Team packs, workshop)
- [ ] Founder/launch pricing with start and end dates (currently manual via admin)
- [ ] Define what AI Mastery Mentored delivers (coaching) before opening it; upgrade path from AI Mastery
- [ ] Decide the hero title (brief vs design; editable in CMS)

## Phase E — enterprise (not started) · Phase F — hardening (not started)

## External dependencies still needed
Supabase project · Stripe account (test mode) · Resend or equivalent · video provider (Mux) · hosting · domain · instructor content and bio · legal review · error monitoring.
