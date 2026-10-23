import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { Container, Notice } from "@/components/ui";
import { getSection } from "@/lib/cms";

export const metadata: Metadata = { title: "Le formateur", alternates: { canonical: "/formateur" } };
export const revalidate = 60;

export default async function InstructorPage() {
  const profile = await getSection("formateur", "profil");
  return (
    <Container className="py-12">
      <h1 className="text-4xl font-semibold tracking-tight">{profile?.title ?? "Le formateur"}</h1>
      <p className="mt-4 max-w-2xl text-muted">{profile?.subtitle ?? "TRAIL Academy est animée par un formateur unique, spécialiste de l'IA produit, de l'ingénierie IA, de l'IA agentique et de la transformation en entreprise."}</p>
      {profile?.body_md ? <div className="mt-8 max-w-2xl"><Markdown>{profile.body_md}</Markdown></div> : (
        <div className="mt-8 max-w-2xl"><Notice title="Profil à compléter">La biographie, la photo et les références du formateur seront renseignées depuis l'interface d'administration. Aucun logo, témoignage ou contenu d'un ancien employeur n'est repris sans autorisation explicite.</Notice></div>
      )}
    </Container>
  );
}
