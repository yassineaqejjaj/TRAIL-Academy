import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/markdown";

describe("Markdown", () => {
  it("renders formatting", () => {
    const { container } = render(<Markdown>{"## Titre\n\n- un\n- deux\n\n**gras**"}</Markdown>);
    expect(container.querySelector("h2")?.textContent).toBe("Titre");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("strong")?.textContent).toBe("gras");
  });
  it("never renders raw HTML or scripts", () => {
    const { container } = render(<Markdown>{'<script>alert(1)</script><img src=x onerror=alert(1)>\n\ntexte'}</Markdown>);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("<img"); // shown as escaped text, never as an element
    expect(container.querySelector("[onerror]")).toBeNull();
  });
  it("neutralises javascript: links and hardens external ones", () => {
    const { container } = render(<Markdown>{"[mal](javascript:alert(1)) [ok](https://example.com)"}</Markdown>);
    const links = container.querySelectorAll("a");
    expect(links[0].getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
    expect(links[1].getAttribute("rel")).toContain("noopener");
  });
});
