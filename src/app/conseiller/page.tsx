import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/load";
import { llmConfigured } from "@/lib/advisor/llm";
import { Advisor } from "./advisor";
import { TextAdvisor } from "./text-advisor";

export const metadata: Metadata = { title: "Trouver mon parcours", description: "Décrivez votre métier et votre objectif : le conseiller vous propose un parcours de formation IA adapté.", alternates: { canonical: "/conseiller" } };

export const dynamic = "force-dynamic";

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const catalog = await getCatalog();
  const questionnaire = (await searchParams).mode === "questionnaire";
  return (
    <Container className="py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Trouver mon parcours</h1>
      <p className="mt-3 max-w-2xl text-muted">{questionnaire ? "Six questions, une recommandation expliquée. Le conseiller applique des règles fixes : aucune donnée n'est envoyée." : "Décrivez votre métier et votre objectif avec vos mots : le conseiller en déduit un parcours et vous explique pourquoi."}</p>
      <nav aria-label="Mode du conseiller" className="mt-6 flex gap-2">
        <Link href="/conseiller" aria-current={!questionnaire ? "page" : undefined} className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold ${!questionnaire ? "bg-primary text-primary-fg" : "border border-border"}`}>Décrire mon besoin</Link>
        <Link href="/conseiller?mode=questionnaire" aria-current={questionnaire ? "page" : undefined} className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold ${questionnaire ? "bg-primary text-primary-fg" : "border border-border"}`}>Répondre à 6 questions</Link>
      </nav>
      {questionnaire ? <Advisor catalog={catalog} /> : <TextAdvisor catalog={catalog} llmEnabled={llmConfigured()} />}
    </Container>
  );
}
