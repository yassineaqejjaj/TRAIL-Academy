import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b1f3a", color: "#faf8f4" }}>
        <div style={{ fontSize: 40, color: "#5fd0d8", fontWeight: 700, letterSpacing: 2 }}>TRAIL ACADEMY</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>Apprendre l'IA. Appliquer l'IA. Piloter avec l'IA.</div>
        <div style={{ fontSize: 30, marginTop: 36, color: "#b8c4d4" }}>18 modules et 2 parcours pour les professionnels du produit et de la tech</div>
      </div>
    ),
    size,
  );
}
