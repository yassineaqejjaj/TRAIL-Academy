import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { asUser, dbConfigured } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { runTutor, type TutorDeps } from "@/lib/tutor/engine";
import { tutorComplete } from "@/lib/tutor/llm";
import { MODES } from "@/lib/tutor/prompt";
import type { Extract } from "@/lib/tutor/search";

export const dynamic = "force-dynamic";

const body = z.object({
  lessonId: z.string().uuid(),
  mode: z.enum(MODES as [string, ...string[]]),
  question: z.string().max(600).optional(),
  selection: z.string().max(900).optional(),
  hintLevel: z.number().int().min(1).max(3).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(700) })).max(6).optional(),
});

interface ChunkRow { id: string; lesson_id: string; course_id: string; heading: string; anchor: string; body: string; rank: number }
const toExtract = (r: ChunkRow): Extract => ({ id: r.id, lessonId: r.lesson_id, courseId: r.course_id, heading: r.heading, anchor: r.anchor, body: r.body, rank: r.rank });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Connectez-vous pour utiliser le tuteur." }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Service non configuré." }, { status: 503 });
  // Per minute (burst) and per day (cost): the limits live in PostgreSQL, shared by every instance.
  if (!(await rateLimit(`tutor-min:${user.id}`, 6, 60_000)) || !(await rateLimit(`tutor-day:${user.id}`, 40, 24 * 3600_000))) {
    return NextResponse.json({ error: "Vous avez atteint la limite de questions pour le moment. Réessayez plus tard." }, { status: 429 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  const input = parsed.data;

  try {
    // Everything database-related runs with the person's own rights: no access to the lesson, no extract.
    return await asUser(user.id, async (q) => {
      const lesson = await q.one<{ id: string; title: string; course_id: string }>("select id, title, course_id from lessons where id = $1", [input.lessonId]);
      if (!lesson) return NextResponse.json({ error: "Leçon introuvable ou non accessible." }, { status: 404 });
      const deps: TutorDeps = {
        search: async (query, courseId, lessonId) => (await q<ChunkRow>("select * from search_content_chunks($1, $2, $3, 8)", [query, courseId, lessonId])).map(toExtract),
        lessonExtracts: async (lessonId, limit) => (await q<ChunkRow>("select id, lesson_id, course_id, heading, anchor, body, 0::real as rank from content_chunks where lesson_id = $1 order by position limit $2", [lessonId, limit])).map(toExtract),
        lessonInfo: async (ids) => {
          const rows = await q<{ id: string; title: string; slug: string }>("select l.id, l.title, c.slug from lessons l join courses c on c.id = l.course_id where l.id = any($1)", [ids]);
          return new Map(rows.map((r) => [r.id, { title: r.title, href: `/apprendre/${r.slug}/${r.id}` }]));
        },
        complete: (system, userText) => tutorComplete(system, userText),
      };
      const result = await runTutor({ mode: input.mode as never, question: input.question, selection: input.selection, hintLevel: input.hintLevel, history: input.history, lessonId: lesson.id, courseId: lesson.course_id, lessonTitle: lesson.title }, deps);
      return NextResponse.json(result);
    });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "tutor_failed", error: e instanceof Error ? e.message : String(e) }));
    return NextResponse.json({ error: "Le tuteur est indisponible pour le moment." }, { status: 500 });
  }
}
