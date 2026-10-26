import { getCatalog } from "@/lib/catalog/load";
import { getPosts } from "@/lib/cms";
import { llmsFullTxt } from "@/lib/llms";

export const revalidate = 3600;

export async function GET() {
  const [catalog, posts] = await Promise.all([getCatalog(), getPosts()]);
  return new Response(llmsFullTxt(catalog, posts), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
