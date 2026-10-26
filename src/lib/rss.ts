import type { Post } from "@/lib/cms";
import { abs, instructorProfile } from "@/lib/seo";
import { site } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function rssFeed(posts: Post[]): string {
  const items = posts.map((p) => `<item><title>${esc(p.title)}</title><link>${abs(`/ressources/${p.slug}`)}</link><guid isPermaLink="true">${abs(`/ressources/${p.slug}`)}</guid>${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}${p.category ? `<category>${esc(p.category)}</category>` : ""}<dc:creator>${esc(instructorProfile.name)}</dc:creator><description>${esc(p.excerpt ?? "")}</description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${esc(site.name)} — Ressources</title><link>${abs("/ressources")}</link><atom:link href="${abs("/ressources/feed.xml")}" rel="self" type="application/rss+xml"/><description>Articles et guides pratiques sur l'IA au travail.</description><language>fr-FR</language>${items}</channel></rss>`;
}
