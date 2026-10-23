import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/markdown";
import { collectSpeechBlocks, splitForSpeech } from "@/lib/read-aloud";

describe("splitForSpeech", () => {
  it("cuts on sentence ends and keeps abbreviations together", () => {
    expect(splitForSpeech("Première phrase. Seconde phrase ! Troisième ?")).toEqual(["Première phrase.", "Seconde phrase !", "Troisième ?"]);
    expect(splitForSpeech("Utilisez des outils (p. ex. un tableur). Merci.")).toEqual(["Utilisez des outils (p. ex. un tableur).", "Merci."]);
  });
  it("breaks very long sentences below the limit without losing words", () => {
    const long = Array.from({ length: 60 }, (_, i) => `mot${i}`).join(" ");
    const parts = splitForSpeech(long, 100);
    expect(parts.every((p) => p.length <= 100)).toBe(true);
    expect(parts.join(" ")).toBe(long);
  });
  it("returns nothing for blank text", () => { expect(splitForSpeech("  \n ")).toEqual([]); });
});

describe("collectSpeechBlocks", () => {
  it("reads headings, paragraphs and list items in order, skips code, and announces diagrams", () => {
    const { container } = render(<div id="t"><Markdown>{"## Titre\n\nUn paragraphe.\n\n- un\n- deux\n\n```python\nprint('x')\n```\n\nFin."}</Markdown></div>);
    const texts = collectSpeechBlocks(container).map((b) => b.text);
    expect(texts).toEqual(["Titre", "Un paragraphe.", "un", "deux", "Fin."]);
    const withSvg = document.createElement("div");
    withSvg.innerHTML = '<p>Avant</p><div><svg><title>Cycle de vie</title></svg></div><p>Après</p>';
    expect(collectSpeechBlocks(withSvg).map((b) => b.text)).toEqual(["Avant", "Schéma. Cycle de vie.", "Après"]);
  });
});

describe("Markdown with diagrams", () => {
  it("shows a loading placeholder for a mermaid block instead of its source, and still renders other code", () => {
    const { container } = render(<Markdown>{"```mermaid\nflowchart LR\n A-->B\n```\n\n```js\nlet a = 1\n```"}</Markdown>);
    expect(container.querySelector('[aria-label="Chargement du schéma"]')).not.toBeNull();
    expect(container.textContent).toContain("let a = 1");
    expect(container.textContent).not.toContain("flowchart LR");
  });
});
