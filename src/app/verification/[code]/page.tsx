import type { Metadata } from "next";
import { Container, Notice } from "@/components/ui";
import { asAnon } from "@/lib/db";
import { dbConfigured } from "@/lib/db/pool";
import { PrintButton } from "./print-button";
import { ButtonLink } from "@/components/ui";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vérification d'attestation", robots: { index: false } };

interface Attestation { course_title: string; issued_at: string; holder_name: string | null }

async function lookup(code: string): Promise<Attestation | null> {
  if (!dbConfigured() || !/^[0-9a-f]{24}$/.test(code)) return null;
  return asAnon((q) => q.one<Attestation>("select course_title, issued_at, holder_name from verify_attestation($1)", [code]));
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await lookup(code);
  return (
    <Container className="max-w-2xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Attestation de réalisation</h1>
      {row ? (
        <div className="mt-6 glass rounded-2xl p-8">
          <p className="text-sm text-muted">Décernée à</p>
          <p className="text-2xl font-semibold">{row.holder_name ?? "Apprenant·e"}</p>
          <p className="mt-4 text-sm text-muted">pour avoir validé le module</p>
          <p className="text-xl font-medium">{row.course_title}</p>
          <p className="mt-4 text-sm text-muted">Délivrée le {new Date(row.issued_at).toLocaleDateString("fr-FR")} · Code de vérification : <span className="font-mono">{code}</span></p>
          <div className="mt-6 flex flex-wrap gap-3 print:hidden"><PrintButton /><ButtonLink variant="secondary" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${site.url}/verification/${code}`)}`} target="_blank" rel="noopener noreferrer">Partager sur LinkedIn</ButtonLink><ButtonLink variant="secondary" href="/formations">Découvrir les formations</ButtonLink></div>
        </div>
      ) : (
        <div className="mt-6"><Notice title="Attestation introuvable">Ce code ne correspond à aucune attestation.</Notice></div>
      )}
      <p className="mt-6 text-xs text-muted">Cette attestation est un justificatif privé de réalisation d'un module de formation délivré par TRAIL Academy. Elle ne constitue ni une certification d'État ni une qualification inscrite au RNCP.</p>
    </Container>
  );
}
