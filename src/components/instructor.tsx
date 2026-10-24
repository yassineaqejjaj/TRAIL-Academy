import Image from "next/image";

export const instructor = {
  name: "Yassine Aqejjaj",
  linkedin: "https://www.linkedin.com/in/yassine-aqejjaj/",
  expertise: ["IA générative", "IA agentique (Agentic AI)", "AI Product Management", "Plateformes multi-agents", "Mise en production de solutions IA"],
} as const;

export function InstructorPhoto({ size = 240, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/formateur/yassine-aqejjaj.webp"
      alt={`Portrait de ${instructor.name}, formateur de TRAIL Academy`}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className="aspect-square rounded-2xl border border-border object-cover"
    />
  );
}

export function ExpertiseTags() {
  return <ul className="flex flex-wrap gap-2">{instructor.expertise.map((t) => <li key={t} className="rounded-full border border-border px-3.5 py-1.5 text-sm">{t}</li>)}</ul>;
}
