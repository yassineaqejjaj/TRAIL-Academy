import { fold } from "./chunk";

const STOP = new Set("le la les un une des de du d l et ou a au aux en dans sur pour par avec sans que qui quoi quel quelle quels quelles je j me mon ma mes moi nous notre nos vous votre est suis sont etre ai avoir fait faire ce cet cette ces il elle on ils elles ne pas plus se sa son ses y comment pourquoi quand ou peux peut pouvez veux voudrais expliquer explique explique-moi donne donner exemple simplement reformule reformuler resume resumer encore aussi tres bien tout tous cela ceci cest c est que qu".split(" "));

/** Words of a question worth searching for: folded, letters and digits only, no stop words, at most 12. */
export function searchTerms(question: string, max = 12): string[] {
  const seen = new Set<string>();
  for (const raw of fold(question).split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    seen.add(raw);
    if (seen.size >= max) break;
  }
  return [...seen];
}

/** tsquery text for search_content_chunks(): terms joined with OR. Terms contain only [a-z0-9], so they can never inject syntax. */
export function toTsQuery(terms: string[]): string | null {
  const safe = terms.filter((t) => /^[a-z0-9]+$/.test(t));
  return safe.length ? safe.join(" | ") : null;
}

export interface Extract { id: string; lessonId: string; courseId: string; heading: string; anchor: string; body: string; rank: number }
