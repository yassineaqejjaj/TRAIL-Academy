import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Reads the design tokens of globals.css and checks WCAG contrast of the combinations the interface really uses, in both themes. */
const css = readFileSync("src/app/globals.css", "utf8");
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
const themes = { dark: block(":root"), light: { ...block(":root"), ...block(':root[data-theme="light"]') } } as Record<"dark" | "light", Record<string, string>>;

type RGBA = [number, number, number, number];
function parse(v: string): RGBA {
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) { const n = parseInt(hex[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  const m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) { const p = m[1].split(",").map((x) => Number(x.trim())); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error(`unsupported color ${v}`);
}
const over = (top: RGBA, base: RGBA): RGBA => [0, 1, 2].map((i) => Math.round(top[i] * top[3] + base[i] * (1 - top[3]))).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => [r, g, b].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: RGBA, b: RGBA) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe.each(["dark", "light"] as const)("%s theme contrast", (name) => {
  const t = themes[name];
  const bg = parse(t.bg);
  const color = (token: string, on: string) => { const base = on === "bg" ? bg : over(parse(t[on]), bg); return over(parse(t[token]), base); };
  const text: [string, string][] = [
    ["fg", "bg"], ["fg", "surface"], ["fg", "surface-2"], ["fg-muted", "bg"], ["fg-muted", "surface"], ["fg-muted", "surface-2"],
    ["accent", "bg"], ["accent", "surface"], ["accent", "accent-soft"], ["accent-ink", "accent-soft"], ["kicker", "bg"], ["kicker", "surface"],
    ["on-accent", "accent"], ["primary-fg", "primary"], ["warn", "warn-soft"], ["warn", "bg"], ["danger", "bg"], ["danger", "surface"], ["success", "bg"], ["success", "surface"],
    ["band-fg", "band"], ["band-muted", "band"],
  ];
  it.each(text)("text %s on %s reaches 4.5:1", (fg, on) => {
    const solidBase = on === "bg" ? bg : over(parse(t[on]), bg);
    expect(ratio(over(parse(t[fg]), solidBase), solidBase), `${name}: ${fg} on ${on}`).toBeGreaterThanOrEqual(4.5);
  });
  const ui: [string, string][] = [["field-border", "bg"], ["field-border", "surface"], ["ring", "bg"], ["ring", "surface"], ["blue", "bg"], ["accent", "bg"]];
  it.each(ui)("interface element %s on %s reaches 3:1", (fg, on) => {
    const base = on === "bg" ? bg : over(parse(t[on]), bg);
    expect(ratio(over(parse(t[fg]), base), base), `${name}: ${fg} on ${on}`).toBeGreaterThanOrEqual(3);
  });
  it("defines every token the components rely on", () => {
    for (const k of ["bg", "surface", "surface-2", "fg", "fg-muted", "border", "primary", "primary-fg", "accent", "accent-soft", "accent-ink", "on-accent", "blue", "kicker", "warn", "warn-soft", "danger", "success", "ring", "tint", "tint-weak", "inset", "hairline", "selected", "disabled", "field-border", "band-soft"]) expect(t[k], `${name}: --${k}`).toBeTruthy();
  });
  void color;
});

describe("both themes", () => {
  it("light uses the requested palette", () => {
    const l = themes.light;
    expect(l.bg).toBe("#faf8f4"); expect(l.surface).toBe("#ffffff"); expect(l["surface-2"]).toBe("#f2f5f5"); expect(l.fg).toBe("#0b1f3a");
    expect(l["fg-muted"]).toBe("#526174"); expect(l.primary).toBe("#0b7a83"); expect(l.blue).toBe("#2563eb"); expect(l.border).toBe("#e2e7ea"); expect(l["accent-soft"]).toBe("#e7f4f1");
  });
  it("dark keeps its identity", () => {
    expect(themes.dark.bg).toBe("#050d1c"); expect(themes.dark.accent).toBe("#3ccfc0"); expect(themes.dark.blue).toBe("#4f8dff");
  });
});
