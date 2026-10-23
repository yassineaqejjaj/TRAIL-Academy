import type { Metadata } from "next";
import { ExpertiseTags, InstructorPhoto, instructor } from "@/components/instructor";
import { Markdown } from "@/components/markdown";
import { ButtonLink, Container } from "@/components/ui";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Le formateur",
  description: `${instructor.name} conçoit et anime toutes les formations de TRAIL Academy : IA produit, ingénierie IA, IA agentique et transformation en entreprise.`,
  alternates: { canonical: "/formateur" },
};
export const revalidate = 60;

export default async function InstructorPage() {
  const profile = await getSection("formateur", "profil");
  return (
    <Container className="py-12">
      <div className="flex flex-col gap-10 md:flex-row md:items-start">
        <InstructorPhoto size={320} priority />
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Votre formateur</p>
          <h1 className="text-4xl font-bold sm:text-5xl">{profile?.title ?? instructor.name}</h1>
          <p className="mt-4 text-muted [text-wrap:pretty]">{profile?.subtitle ?? "TRAIL Academy est animée par un formateur unique, spécialiste de l'IA produit, de l'ingénierie IA, de l'IA agentique et de la transformation en entreprise."}</p>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Domaines d'expertise</h2>
          <ExpertiseTags />
          {profile?.body_md && <div className="mt-8"><Markdown>{profile.body_md}</Markdown></div>}
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={instructor.linkedin} variant="secondary" target="_blank" rel="noopener noreferrer">Profil LinkedIn</ButtonLink>
            <ButtonLink href="/formations">Voir les formations</ButtonLink>
          </div>
        </div>
      </div>
    </Container>
  );
}
