import Link from "next/link";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { signOut } from "../connexion/actions";
import { AccountNav } from "./account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-display text-2xl font-bold tracking-[0.04em]">TRAIL</span><span className="text-sm font-medium text-muted">Academy</span></Link>
          <nav aria-label="Espace apprenant" className="flex flex-wrap gap-6"><AccountNav /></nav>
          <form action={signOut}><button type="submit" className="min-h-11 px-2 text-[15px] font-medium text-muted hover:text-fg">Se déconnecter</button></form>
        </Container>
      </header>
      {children}
    </div>
  );
}
