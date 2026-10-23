/** Pure helpers for the "Read aloud" feature (no browser API here, so they are unit-tested). */

/**
 * Splits text into sentences of at most `max` characters. Speech engines stall on very long utterances, so a long
 * sentence is cut at the last comma, semicolon or space before the limit.
 */
export function splitForSpeech(text: string, max = 220): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences: string[] = [];
  // A sentence end followed by a lowercase letter is an abbreviation ("p. ex. un tableur"), not a new sentence.
  for (const part of clean.split(/(?<=[.!?…:])\s+/)) {
    if (sentences.length && /^[a-zàâçéèêëîïôûùüÿœ]/.test(part)) sentences[sentences.length - 1] += ` ${part}`;
    else sentences.push(part);
  }

  const out: string[] = [];
  for (let s of sentences) {
    while (s.length > max) {
      const window = s.slice(0, max);
      const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(" "));
      const at = cut > max * 0.4 ? cut + 1 : max;
      out.push(s.slice(0, at).trim());
      s = s.slice(at).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

export interface SpeechBlock { text: string; element: Element }

const SPOKEN = "h1, h2, h3, h4, p, li, blockquote";

/** The readable blocks of a rendered article, in order: no code, no diagrams (announced instead), no nested duplicates. */
export function collectSpeechBlocks(root: Element, figureLabel = "Schéma."): SpeechBlock[] {
  const blocks: SpeechBlock[] = [];
  for (const el of Array.from(root.querySelectorAll(`${SPOKEN}, svg, pre`))) {
    if (el.closest("pre") && el.tagName !== "PRE") continue;
    if (el.tagName === "PRE") { continue; }
    if (el.tagName.toLowerCase() === "svg") {
      const title = el.querySelector("title")?.textContent?.trim();
      blocks.push({ element: el.parentElement ?? el, text: title ? `${figureLabel} ${title}.` : figureLabel });
      continue;
    }
    if (el.closest("svg")) continue;
    // A list item or quote that contains block children is read through those children.
    if (el.tagName !== "P" && el.querySelector("p, ul, ol, li")) continue;
    if (el.tagName === "LI" || el.tagName === "BLOCKQUOTE" || el.tagName === "P") { /* readable */ }
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ text, element: el });
  }
  return blocks;
}
