import { describe, expect, it } from "vitest";
import { staticCatalog } from "@/lib/catalog";
import { generalFaq } from "@/lib/faq-data";
import { llmsFullTxt, llmsTxt } from "@/lib/llms";
import { rssFeed } from "@/lib/rss";
import { articleLd, breadcrumbLd, clean, courseLd, faqLd, siteGraph } from "@/lib/seo";
import robots from "@/app/robots";

const post = { id: "1", slug: "rag-en-production", title: "RAG <en> production & coûts", excerpt: "Résumé", body_md: "un deux trois", category: "RAG", related_course_ids: [], seo_title: null, seo_description: null, published_at: "2026-10-01T00:00:00Z" };

describe("structured data", () => {
  it("clean drops undefined, null and empty arrays recursively", () => {
    expect(clean({ a: 1, b: undefined, c: null, d: [], e: { f: undefined, g: [1] } })).toEqual({ a: 1, e: { g: [1] } });
  });
  it("site graph links organization, website and the instructor", () => {
    const g = siteGraph() as { "@graph": { "@type": string; "@id": string }[] };
    expect(g["@graph"].map((n) => n["@type"])).toEqual(["EducationalOrganization", "WebSite", "Person"]);
    expect(JSON.stringify(g)).toContain("linkedin.com/in/yassine-aqejjaj");
  });
  it("course data has an offer only when a price is given and never a rating", () => {
    const base = { slug: "x", code: "M1", title: "T", summary: "S", level: "Débutant", hours: 6, outcomes: ["o"], topics: ["t"], prerequisites: [], accessMonths: 12 };
    const free = JSON.stringify(courseLd({ ...base, priceCents: null }));
    const paid = JSON.parse(JSON.stringify(courseLd({ ...base, priceCents: 19900 })));
    expect(free).not.toContain("offers");
    expect(paid.offers.price).toBe("199.00");
    expect(paid.offers.priceCurrency).toBe("EUR");
    expect(JSON.stringify(paid)).not.toMatch(/aggregateRating|Review|ratingValue/);
    expect(paid.timeRequired).toBe("PT6H");
  });
  it("article, breadcrumb and FAQ data are well formed", () => {
    const a = articleLd({ slug: post.slug, title: post.title, published: post.published_at, body: post.body_md, category: post.category }) as Record<string, unknown>;
    expect(a["@type"]).toBe("BlogPosting");
    expect(a.wordCount).toBe(3);
    const b = breadcrumbLd([{ name: "A", path: "/" }, { name: "B", path: "/b" }]) as { itemListElement: { position: number }[] };
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    const f = faqLd(generalFaq) as { mainEntity: unknown[] };
    expect(f.mainEntity).toHaveLength(generalFaq.length);
  });
});

describe("crawler files", () => {
  it("robots keeps private areas out and lets AI assistants read public pages", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    for (const rule of rules) expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/compte", "/apprendre", "/api/"]));
    const ai = rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes("GPTBot"));
    expect(ai?.userAgent).toEqual(expect.arrayContaining(["ClaudeBot", "PerplexityBot", "OAI-SearchBot", "Google-Extended"]));
    expect(r.sitemap).toMatch(/sitemap\.xml$/);
  });
  it("llms.txt lists every module with its page and the full version includes the FAQ", () => {
    const t = llmsTxt(staticCatalog, [post]);
    expect(t.startsWith("# TRAIL Academy")).toBe(true);
    for (const c of staticCatalog.courses) expect(t).toContain(`/formations/${c.slug}`);
    expect(t).toContain("/ressources/rag-en-production");
    expect(llmsFullTxt(staticCatalog, [post])).toContain(generalFaq[0].q);
  });
  it("RSS escapes markup in titles", () => {
    const x = rssFeed([post]);
    expect(x).toContain("RAG &lt;en&gt; production &amp; coûts");
    expect(x).toContain("<rss");
  });
  it("FAQ answers do not promise unimplemented things", () => {
    expect(generalFaq.map((f) => f.a).join(" ")).not.toMatch(/certification RNCP\s+reconnue|garantie de résultat|emploi garanti/i);
  });
});
