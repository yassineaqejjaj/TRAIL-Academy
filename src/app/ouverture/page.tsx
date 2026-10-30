import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist";
import { getCatalog } from "@/lib/catalog/load";
import { availabilitySummary, waitlistOptions } from "@/lib/waitlist";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Être informé de l'ouverture des formations",
  description: "Les inscriptions ouvrent bientôt. Choisissez un module ou un parcours et laissez votre e-mail : vous serez prévenu à l'ouverture, sans engagement.",
  alternates: { canonical: "/ouverture" },
};

export default async function OpeningPage({ searchParams }: { searchParams: Promise<{ formation?: string }> }) {
  const [catalog, sp] = await Promise.all([getCatalog(), searchParams]);
  const options = waitlistOptions(catalog);
  const s = availabilitySummary(catalog);
  const wanted = options.some((o) => o.slug === sp.formation) ? sp.formation : undefined;
  return (
    <Container className="max-w-2xl py-12">
      <h1 className="display-light text-4xl sm:text-5xl">Être informé de l'ouverture</h1>
      <p className="mt-3 text-muted">{s.buyable > 0 ? `${s.buyable} modules sont déjà ouverts à l'achat.` : "Les inscriptions ne sont pas encore ouvertes."} {s.preview > 0 && `${s.preview} modules sont rédigés et lisibles en aperçu gratuit. `}{s.preparing > 0 && `${s.preparing} sont en préparation.`}</p>
      <div className="mt-8 glass rounded-3xl p-8"><WaitlistForm options={options} defaultSlug={wanted} /></div>
      <div className="mt-6"><Notice tone="info" title="Ce que vous recevrez">Un seul e-mail à l'ouverture de ce que vous avez choisi. Vous pouvez vous désinscrire à tout moment. En attendant : <Link href="/evaluation" className="font-semibold text-accent hover:underline">évaluez votre niveau</Link>, lisez une leçon gratuite dans le <Link href="/formations" className="font-semibold text-accent hover:underline">catalogue</Link> ou essayez la <Link href="/apercu-plateforme" className="font-semibold text-accent hover:underline">démonstration</Link>.</Notice></div>
    </Container>
  );
}
