# Product

**Price grid (seeded; editable in admin, history kept):** Module Standard 199 € TTC and Module Avancé 299 € TTC (Vibe Coding, RAG, Agentic AI, AI Evaluation & Observability), 12 months · Product Manager Augmenté 990 € (9 modules), AI Product Manager 1 490 € (13), AI Mastery 1 990 € (18), AI Mastery Mentored 2 990 € (18 + coaching, kept closed until the coaching is defined), 18 months · Team 5 7 500 € HT and Team 20 24 000 € HT (5 / 20 AI Mastery licences, 12 months) · Private Workshop 2 500–3 500 € HT per day · Enterprise Custom on quotation.

**Founder (launch) prices — proposals to test, not applied automatically:** Standard 149 €, Avancé 229 €, PM Augmenté 790 €, AI PM 1 190 €, AI Mastery 1 590 €, Mentored 2 490 € (TTC). Rules: only for offers that are actually available, only during a defined launch period. To run one today, change the price in Admin → Produits et prix (history is kept; past orders keep their price) and change it back at the end of the period. There is no automatic start/end date yet (candidate improvement: `valid_from/valid_until` on prices).

**Rules implemented:** all 18 modules and 4 phases visible; none purchasable until published; paths/bundle cover the exact module sets specified (tested); bundles never charge again for included content (entitlement upsert extends rather than duplicates).

**Not implemented yet:** purchase, learning player, quizzes, assignments, attestations, admin tools, enterprise management, CMS-driven content, blog.

**Advisor:** deterministic, rules in `src/lib/advisor/rules.ts`, explains every recommendation. Runs client-side; no data leaves the browser.

**Claims policy:** no testimonials, social proof, reviews or completion counts are shown (none are verified). Attestations are private and are never described as State certification or RNCP. Duration figures are planning estimates to be confirmed by the instructor.

**BMAD:** M7 uses the official expansion "Breakthrough Method for Agile AI-Driven Development" (BMad Method), checked against the project's GitHub repository (bmad-code-org/BMAD-METHOD). The module syllabus must still be written against the current official docs.

## Commerce rules (Phase C)
- One-time Stripe Checkout; promotion codes enabled; invoices created by Stripe; billing portal link; order history in `/compte/commandes`.
- An offer is purchasable only when **every** included module is published and the offer is active. Content already held under an active entitlement can never be bought again; a bundle extends, never duplicates.
- Revocation: see DATABASE.md (pending legal confirmation). Preorders are not implemented.
- Enterprise packs and quotations are not purchasable online (Phase E).
- Emails: purchase confirmation and refund notice (French plain text) via Resend when configured; failures are logged to `email_events`, never block payment processing.

## Administration and CMS (Phase D)
Admin can create/edit modules, chapters, lessons (video id, Markdown, transcript, chapters, subtitles, resources), quizzes and assignments, set prerequisites and completion rules, preview, and publish/unpublish (publishing is gated by a readiness check). Paths, products, prices (with history), coupons, orders (refund request), learners (manual grant/revoke with reason), assignment review, CMS blocks (home hero, instructor profile, FAQ, verified testimonials, articles with SEO, legal page texts) and the audit log. The public catalogue reads from the database (falling back to the seed data if no database is configured) and revalidates every 60 s or immediately after an admin edit.

Not in Phase D: enterprise accounts/licences (Phase E), advisor-rules editor (rules are still in `src/lib/advisor/rules.ts`), system settings/compliance screen, video upload to the provider (videos are uploaded at Mux; the admin pastes the signed-playback id), manual review queue for free-text quiz answers.

## Design
The UI follows the supplied design canvas (warm off-white #FAF8F4, navy #0B1F3A, teal #0B7A83, Sora headings, Inter text, 16 px cards, pill filters, admin sidebar). Light and dark themes are both supported (the design shows light only). **Prices follow the grid above, which matches the design.** The hero title is still the brief's ("Maîtrisez l'IA. Appliquez-la à votre métier."; the design says "Devenez le professionnel qui maîtrise vraiment l'IA." — change it in the CMS if preferred). Screens in the design that belong to later phases (team space, enterprise admin, advisor-rules editor, settings) are not built.
