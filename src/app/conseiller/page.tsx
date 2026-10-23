import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/load";
import { Advisor } from "./advisor";

export const metadata: Metadata = { title: "Trouver mon parcours", description: "Répondez à six questions pour obtenir un parcours de formation IA adapté.", alternates: { canonical: "/conseiller" } };

export const revalidate = 60;

export default async function AdvisorPage() {
  const catalog = await getCatalog();
  return (
    <Container className="py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Trouver mon parcours</h1>
      <p className="mt-3 max-w-2xl text-muted">Six questions, une recommandation expliquée. Le conseiller applique des règles fixes : aucune IA n'intervient et aucune donnée n'est envoyée.</p>
      <Advisor catalog={catalog} />
    </Container>
  );
}
