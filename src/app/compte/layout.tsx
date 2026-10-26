import Link from "next/link";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { signOut } from "../connexion/actions";
import { AccountNav } from "./account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = Boolean(await asUser(user.id, (q) => q.one("select 1 as ok from user_roles where user_id = $1 and role = 'admin'", [user.id])).catch(() => null));
  const orgRole = await asUser(user.id, (q) => q.one<{ is_manager: boolean; n: number }>("select coalesce(bool_or(role = 'manager'), false) as is_manager, count(*)::int as n from organization_members where user_id = $1 and accepted_at is not null", [user.id])).catch(() => null);
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-baseline gap-2"><span className="font-display text-2xl font-bold tracking-[0.04em]">TRAIL</span><span className="text-sm font-medium text-muted">Academy</span></Link>
          <nav aria-label="Espace apprenant" className="flex flex-wrap gap-6"><AccountNav />{(orgRole?.is_manager || isAdmin) && <Link href="/equipe" className="py-2.5 text-[15px] font-medium">Mon équipe</Link>}{orgRole && orgRole.n > 0 && <Link href="/compte/organisation" className="py-2.5 text-[15px] font-medium">Mon organisation</Link>}{isAdmin && <Link href="/admin" className="py-2.5 text-[15px] font-semibold text-accent">Administration</Link>}</nav>
          <form action={signOut}><button type="submit" className="min-h-11 px-2 text-[15px] font-medium text-muted hover:text-fg">Se déconnecter</button></form>
        </Container>
      </header>
      {children}
    </div>
  );
}
