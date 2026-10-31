/** What reaches the screen: plain text, bounded, with only valid citations kept. */
export interface Checked { text: string; cited: number[]; grounded: boolean }

export function checkAnswer(raw: string, extractCount: number, maxLength = 1200): Checked {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]*)\]\((?:[^)]*)\)/g, (_m, label: string) => (/^\d+$/.test(label) ? `[${label}]` : label))
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/[ \t]+/g, " ");
  const cited = new Set<number>();
  const text = cleaned.replace(/\[(\d{1,2})\]/g, (_m, n: string) => {
    const k = Number(n);
    if (k >= 1 && k <= extractCount) { cited.add(k); return `[${k}]`; }
    return "";
  }).replace(/[ \t]+([.,;:!?])/g, "$1").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxLength);
  return { text, cited: [...cited].sort((a, b) => a - b), grounded: cited.size > 0 && text.length >= 20 };
}
