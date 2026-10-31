import { slugify } from "@/lib/slug";

export interface Chunk { position: number; heading: string; anchor: string; body: string; search_text: string }

/** Accents removed, lower case: the same normalisation is applied to the indexed text and to the question. */
export const fold = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ");

const MAX_WORDS = 260;

/** Markdown without the syntax that carries no meaning for search or for the model (diagram sources, link targets, emphasis marks). */
function plain(md: string): string {
  return md
    .replace(/```mermaid[\s\S]*?```/g, " ")
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ""))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Cuts a lesson at its "##" headings (one extract per section) and splits long sections at paragraph breaks. */
export function chunkLesson(lessonTitle: string, bodyMd: string): Chunk[] {
  const parts = bodyMd.split(/^## +/m);
  const sections: { heading: string; body: string }[] = [];
  if (parts[0].trim()) sections.push({ heading: lessonTitle, body: parts[0] });
  for (const p of parts.slice(1)) {
    const nl = p.indexOf("\n");
    sections.push({ heading: (nl < 0 ? p : p.slice(0, nl)).trim(), body: nl < 0 ? "" : p.slice(nl + 1) });
  }
  const out: Chunk[] = [];
  for (const s of sections) {
    const text = plain(s.body);
    if (text.split(/\s+/).filter(Boolean).length < 8) continue;
    const anchor = slugify(s.heading);
    const paragraphs = text.split(/\n\n+/);
    let cur: string[] = [], words = 0;
    const flush = () => {
      if (!cur.length) return;
      const body = cur.join("\n\n");
      out.push({ position: out.length + 1, heading: s.heading, anchor, body, search_text: fold(`${lessonTitle} ${s.heading} ${s.heading} ${body}`) });
      cur = []; words = 0;
    };
    for (const para of paragraphs) {
      const w = para.split(/\s+/).length;
      if (words + w > MAX_WORDS && cur.length) flush();
      cur.push(para); words += w;
    }
    flush();
  }
  return out;
}
