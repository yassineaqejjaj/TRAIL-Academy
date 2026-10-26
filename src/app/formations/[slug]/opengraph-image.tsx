import { ImageResponse } from "next/og";
import { difficultyLabel, getCourse } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog/load";
import { site } from "@/lib/site";

export const alt = `${site.name} — formation`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function CourseImage({ params }: { params: Promise<{ slug: string }> }) {
  const course = getCourse((await params).slug, await getCatalog());
  const title = course?.title ?? site.name;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b1f3a", color: "#faf8f4" }}>
        <div style={{ fontSize: 34, color: "#5fd0d8", fontWeight: 700, letterSpacing: 2 }}>{course ? `TRAIL ACADEMY · ${course.code}` : "TRAIL ACADEMY"}</div>
        <div style={{ fontSize: title.length > 40 ? 64 : 76, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>{title}</div>
        {course && <div style={{ fontSize: 30, marginTop: 36, color: "#b8c4d4" }}>{`Formation en ligne · ${difficultyLabel[course.difficulty]} · ${Math.round(course.durationHours)} h`}</div>}
      </div>
    ),
    size,
  );
}
