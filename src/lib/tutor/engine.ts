import { buildTutorPrompt, type TutorMode } from "./prompt";
import { searchTerms, toTsQuery, type Extract } from "./search";
import { checkAnswer } from "./verify";

export interface TutorInput { mode: TutorMode; question?: string; selection?: string; hintLevel?: number; lessonId: string; courseId: string; lessonTitle: string; history?: { role: "user" | "assistant"; content: string }[] }
export interface Source { n: number; lessonTitle: string; heading: string; href: string; excerpt: string }
export interface TutorResult { answer: string; mode: "ai" | "extracts"; sources: Source[] }

export interface TutorDeps {
  /** Ranked extracts for a tsquery string, with the CALLER's access rights. */
  search(query: string, courseId: string, lessonId: string): Promise<Extract[]>;
  /** The lesson's own extracts, in reading order. */
  lessonExtracts(lessonId: string, limit: number): Promise<Extract[]>;
  /** Display data for citations: lesson title and public link (with the section anchor appended by the engine). */
  lessonInfo(ids: string[]): Promise<Map<string, { title: string; href: string }>>;
  complete(system: string, user: string): Promise<string | null>;
}

const DEFAULT_QUESTION: Record<TutorMode, string> = {
  ask: "", simplify: "Explique-moi cela plus simplement.", example: "Donne-moi un exemple concret.", summarize: "Résume cette leçon.",
  reformulate: "Voici ma reformulation, dis-moi si elle est juste.", hint: "Donne-moi un indice pour avancer sur cet exercice.",
};
const NOT_FOUND = "Je ne trouve pas de passage du cours qui réponde à cette question. Relisez la leçon ou posez la question au formateur pendant une session en visio.";
const excerpt = (s: string) => (s.length > 260 ? `${s.slice(0, 257).trimEnd()}…` : s);

export async function runTutor(input: TutorInput, deps: TutorDeps): Promise<TutorResult> {
  const question = (input.question?.trim() || DEFAULT_QUESTION[input.mode]).slice(0, 600);
  const selection = input.selection?.trim().slice(0, 900) || undefined;

  // 1. Retrieval: what to show the model (and the person, as citations).
  let found: Extract[] = [];
  const terms = searchTerms([question, input.mode === "hint" || !question ? input.lessonTitle : "", selection ?? ""].join(" "));
  const tsq = toTsQuery(terms);
  if ((input.mode === "summarize" && !selection) || ((input.mode === "simplify" || input.mode === "example") && !selection)) found = await deps.lessonExtracts(input.lessonId, input.mode === "summarize" ? 6 : 4);
  else if (tsq) found = (await deps.search(tsq, input.courseId, input.lessonId)).slice(0, selection ? 3 : 5);
  if (!found.length) found = await deps.lessonExtracts(input.lessonId, 3);

  const info = await deps.lessonInfo([...new Set(found.map((f) => f.lessonId).concat(input.lessonId))]);
  const base = info.get(input.lessonId);
  const items = found.map((f) => {
    const lesson = info.get(f.lessonId);
    return { heading: f.heading, body: f.body, lessonTitle: lesson?.title ?? input.lessonTitle, href: lesson ? `${lesson.href}#${f.anchor}` : "#" };
  });
  if (selection) items.unshift({ heading: "Passage sélectionné", body: selection, lessonTitle: input.lessonTitle, href: base?.href ?? "#" });
  if (!items.length) return { answer: NOT_FOUND, mode: "extracts", sources: [] };

  const toSource = (i: number): Source => ({ n: i + 1, lessonTitle: items[i].lessonTitle, heading: items[i].heading, href: items[i].href, excerpt: excerpt(items[i].body) });
  const extractsOnly = (lead: string): TutorResult => ({ answer: lead, mode: "extracts", sources: items.slice(0, 3).map((_, i) => toSource(i)) });

  // 2. Generation, strictly from those extracts.
  const { system, user } = buildTutorPrompt({ mode: input.mode, question, selection, hintLevel: input.hintLevel, extracts: items, history: input.history?.slice(-4) });
  const raw = await deps.complete(system, user);
  if (raw == null) return extractsOnly("Voici les passages du cours les plus proches de votre demande.");

  // 3. Verification: only valid citations survive; an answer that cites nothing is not shown as an answer.
  const checked = checkAnswer(raw, items.length);
  if (!checked.grounded) return extractsOnly("Je n'ai pas pu formuler une réponse sûre. Voici les passages du cours les plus proches de votre demande.");
  return { answer: checked.text, mode: "ai", sources: checked.cited.map((n) => toSource(n - 1)) };
}
