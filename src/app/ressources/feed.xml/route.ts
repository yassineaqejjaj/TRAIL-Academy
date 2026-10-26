import { getPosts } from "@/lib/cms";
import { rssFeed } from "@/lib/rss";

export const revalidate = 3600;

export async function GET() {
  return new Response(rssFeed(await getPosts()), { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
