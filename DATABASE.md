# Database

PostgreSQL via Supabase. Migrations in `supabase/migrations/`, seed in `supabase/seed.sql` (generated; contains no customers, revenue or testimonials).

- `0001_schema.sql` — enums, identity, learning structure, commerce, enterprise, learning activity, CMS, operations, `provision_order()`.
- `0002_rls.sql` — RLS enabled on **every** public table (default deny), helper functions (`is_admin`, `is_org_manager`, `has_active_entitlement`, `can_view_lesson`), policies, private storage buckets.

- `0003_learning.sql` — completion rules, notes/bookmarks, player metadata (`subtitle_tracks`, `video_chapters`), and SECURITY DEFINER functions: `record_lesson_progress`, `get_quiz_options`, `submit_quiz`, `verify_attestation` (client-callable), `recompute_progress`, `try_complete_course` (internal), `expire_entitlements` (service role). A trigger re-evaluates completion when the instructor accepts an assignment.

- `0005_admin.sql` — `require_admin`, audit triggers on content and money tables, prerequisite cycle guard, `course_readiness`/`publish_course`/`unpublish_course`, `set_product_active`/`set_product_price` (price history), reorder functions, `set_path_courses`, `admin_grant_access`/`admin_revoke_access`, `review_submission`, `log_admin_action`, `admin_metrics`, `interest_signups`, `coupons.stripe_promotion_code_id`. Every function re-checks `is_admin()` itself.

Completion rules (`courses.completion_rules`): `requireAllLessons`, `requireQuizzes`, `requireAssignments` (all default true). A course with no published lessons can never complete. Free-text quiz answers are stored for instructor review and excluded from the automated score; a quiz with only free-text questions cannot be passed automatically.

- `0004_commerce.sql` — `create_checkout_order` (all purchasability rules, price/duration snapshot), `attach_checkout_session`, `process_stripe_event` (idempotent, atomic: event record + order/payment/entitlement effects commit together), extra columns (`orders.discount_cents/paid_at`, `profiles.stripe_customer_id`). All service-role only.

Revocation policy as implemented (needs legal confirmation): full refund → revoke access granted by that order; partial refund → keep; dispute opened → suspend; won → restore (expiry is recalculated from the restore date); lost → stays revoked. Refunding an older order does not revoke an entitlement that a newer order has since extended.

`supabase/dev-fixture.sql` is a development-only placeholder fixture (never part of the seed).

Key constraints: unique `(user_id, course_id)` entitlements; unique `stripe_event_id` for webhook idempotency; append-only `audit_logs`; one active price per product; published testimonials require verification + consent reference; quiz correct answers readable only by admin.

Writes to `orders`, `payments`, `entitlements`, `processed_webhook_events`, `audit_logs`, `user_roles` have no learner policy: service role only.

**Verification status:** migrations, seed and the RLS behaviours in `tests/db.test.ts` are verified on PGlite (embedded Postgres) with stubbed `auth`/`storage` schemas. **Not yet run against a real Supabase project** (Supabase-specific behaviour such as `auth.users` triggers and storage policies needs that check).

Known gaps: no `leads`/newsletter tables yet; `lesson_resources`/video playback tokens are modelled but unused; enterprise manager write paths beyond member invites go through the service role.
