import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";

/** Search and AI-answer crawlers are welcome on public pages; account, admin and learning areas are never crawled. */
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot", "Amazonbot", "meta-externalagent", "MistralAI-User"];
const PRIVATE = ["/admin", "/compte", "/api/", "/apprendre", "/achat", "/avis", "/verification"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: abs("/sitemap.xml"),
    host: abs(),
  };
}
