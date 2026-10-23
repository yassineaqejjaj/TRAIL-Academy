import { readdirSync, readFileSync } from "node:fs";
import mermaid from "mermaid";
import { describe, expect, it } from "vitest";

describe("blog diagrams", () => {
  const files = readdirSync("content/blog").filter((f) => f.endsWith(".md"));
  it("every diagram parses and is accessible and captioned", async () => {
    mermaid.initialize({ startOnLoad: false });
    let count = 0;
    for (const f of files) {
      for (const b of readFileSync(`content/blog/${f}`, "utf8").matchAll(/```mermaid\n([\s\S]*?)\n```([^\n]*\n?[^\n]*)/g)) {
        count++;
        await expect(mermaid.parse(b[1]), f).resolves.toBeTruthy();
        expect(b[1], f).toMatch(/accTitle:/);
        expect(b[1], f).toMatch(/accDescr:/);
        expect(b[2], f).toMatch(/\*Figure/);
      }
    }
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
