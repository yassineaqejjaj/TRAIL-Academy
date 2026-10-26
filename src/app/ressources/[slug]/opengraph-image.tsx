import { ImageResponse } from "next/og";
import { getPost } from "@/lib/cms";
import { site } from "@/lib/site";

export const alt = `${site.name} — article`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function PostImage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  const title = post?.title ?? "Ressources";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b1f3a", color: "#faf8f4" }}>
        <div style={{ fontSize: 34, color: "#5fd0d8", fontWeight: 700, letterSpacing: 2 }}>{`TRAIL ACADEMY · ${post?.category?.toUpperCase() ?? "RESSOURCES"}`}</div>
        <div style={{ fontSize: title.length > 60 ? 56 : 68, fontWeight: 700, marginTop: 24, lineHeight: 1.15 }}>{title}</div>
        <div style={{ fontSize: 28, marginTop: 36, color: "#b8c4d4" }}>Yassine Aqejjaj</div>
      </div>
    ),
    size,
  );
}
