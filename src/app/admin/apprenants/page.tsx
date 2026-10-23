import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";
import { adminDb } from "@/lib/admin/ctx";
import { Input, Table } from "../ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apprenants — administration", robots: { index: false } };

export default async function AdminLearners({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { db } = await adminDb();
  const term = q?.trim().replace(/[%_,()]/g, "") ?? "";
  let query = db.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(50);
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  const { data } = await query;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Apprenants</h1>
      <form role="search" className="mt-4 flex max-w-md gap-2"><Input name="q" defaultValue={q} placeholder="E-mail ou nom" aria-label="Rechercher un apprenant" className="!mt-0" /><Button type="submit" variant="secondary">Rechercher</Button></form>
      <div className="mt-6">
        <Table head={["E-mail", "Nom", "Inscrit le", ""]}>
          {(data ?? []).map((p) => <tr key={p.id}><td className="p-3">{p.email}</td><td className="p-3">{p.full_name ?? "—"}</td><td className="p-3">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td><td className="p-3 text-right"><Link className="font-semibold text-accent hover:underline" href={`/admin/apprenants/${p.id}`}>Ouvrir</Link></td></tr>)}
          {!data?.length && <tr><td colSpan={4} className="p-6 text-center text-muted">Aucun résultat.</td></tr>}
        </Table>
      </div>
    </>
  );
}
