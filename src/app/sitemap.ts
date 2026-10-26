import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog/load";
import { getPosts } from "@/lib/cms";
import { abs } from "@/lib/seo";

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ courses, learningPaths }, posts] = await Promise.all([getCatalog(), getPosts()]);
  const pages: [string, number, Entry["changeFrequency"]][] = [
    ["", 1, "weekly"], ["/formations", 0.9, "weekly"], ["/parcours", 0.9, "weekly"], ["/tarifs", 0.8, "monthly"], ["/faq", 0.7, "monthly"], ["/conseiller", 0.7, "monthly"],
    ["/evaluation", 0.7, "monthly"], ["/apercu-plateforme", 0.6, "monthly"], ["/exemples-livrables", 0.6, "monthly"], ["/formateur", 0.6, "monthly"], ["/entreprise", 0.6, "monthly"], ["/sessions", 0.6, "weekly"], ["/ressources", 0.8, "weekly"],
  ];
  return [
    ...pages.map(([p, priority, changeFrequency]) => ({ url: abs(p), priority, changeFrequency })),
    ...learningPaths.map((p) => ({ url: abs(`/parcours/${p.slug}`), priority: 0.8, changeFrequency: "monthly" as const })),
    ...courses.map((c) => ({ url: abs(`/formations/${c.slug}`), priority: c.status === "published" ? 0.8 : 0.6, changeFrequency: "monthly" as const })),
    ...posts.map((p) => ({ url: abs(`/ressources/${p.slug}`), lastModified: p.published_at ?? undefined, priority: 0.7, changeFrequency: "monthly" as const })),
  ];
}
