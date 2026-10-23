import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog/load";
import { getPosts } from "@/lib/cms";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ courses }, posts] = await Promise.all([getCatalog(), getPosts()]);
  const staticPaths = ["", "/formations", "/parcours", "/tarifs", "/entreprise", "/formateur", "/ressources", "/conseiller", "/sessions"];
  return [
    ...staticPaths.map((p) => ({ url: `${site.url}${p}` })),
    ...courses.map((c) => ({ url: `${site.url}/formations/${c.slug}` })),
    ...posts.map((p) => ({ url: `${site.url}/ressources/${p.slug}`, lastModified: p.published_at ?? undefined })),
  ];
}
