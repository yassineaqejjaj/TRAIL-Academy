# Content guide

- Catalog metadata: `src/lib/catalog/data.ts` (then `npm run seed:generate`). Admin editing arrives in Phase D.
- A module goes live only when the instructor has supplied and validated real lessons, exercises, resources and quiz. Then set its status to `published`; it becomes purchasable.
- Never add placeholder videos, invented testimonials, logos or biography text from a former employer.
- Instructor profile, FAQ, testimonials (with consent reference) and articles will be editable in the admin CMS (Phase D); until then pages show explicit "to be completed" notices.
- Duration and difficulty values are planning estimates — confirm them.

## Lesson content (Phase B)
Until the admin UI exists (Phase D), content is inserted in SQL. A lesson plays video when `video_provider = 'mux'` and `video_asset_id` is a **signed-policy** Mux playback id; otherwise `body_md` is shown as plain text (no HTML/Markdown rendering yet). Subtitle tracks go in `lessons.subtitle_tracks` with files in the private `lesson-resources` bucket. Only lessons with `content_status = 'published'` are visible or counted. Never upload lessons that are not instructor-approved; `dev-fixture.sql` is for local testing only.
