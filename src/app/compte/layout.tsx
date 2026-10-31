import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { signOut } from "../connexion/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AccountNav } from "./account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = Boolean(await asUser(user.id, (q) => q.one("select 1 as ok from user_roles where user_id = $1 and role = 'admin'", [user.id])).catch(() => null));
  const orgRole = await asUser(user.id, (q) => q.one<{ is_manager: boolean; n: number }>("select coalesce(bool_or(role = 'manager'), false) as is_manager, count(*)::int as n from organization_members where user_id = $1 and accepted_at is not null", [user.id])).catch(() => null);
  const links: [string, string][] = [["/compte", "Mon espace"], ["/formations", "Catalogue"], ["/compte/sessions", "Sessions en visio"], ["/compte/commandes", "Commandes"], ["/compte/donnees", "Mes données"]];
  if (orgRole && orgRole.n > 0) links.splice(3, 0, ["/compte/organisation", "Mon organisation"]);
  if (orgRole?.is_manager || isAdmin) links.splice(3, 0, ["/equipe", "Mon équipe"]);
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-wrap gap-6 p-4 sm:p-6">
      <aside aria-label="Navigation de l'espace" className="glass flex w-full flex-none flex-col gap-1 rounded-[28px] p-3.5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[250px]">
        <Link href="/" aria-label="TRAIL Academy, accueil" className="flex px-2.5 pb-4 pt-3"><Logo height={44} /></Link>
        <nav aria-label="Espace apprenant" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"><AccountNav links={links} />{isAdmin && <Link href="/admin" className="shrink-0 rounded-2xl px-3.5 py-3 text-sm font-semibold text-accent hover:bg-tint">Administration</Link>}</nav>
        <div className="mt-2 flex items-center gap-1 lg:mt-auto"><ThemeToggle /><span className="text-sm text-muted">Thème</span></div>
        <form action={signOut}><button type="submit" className="min-h-11 w-full rounded-2xl px-3.5 py-3 text-left text-sm font-medium text-muted hover:bg-tint hover:text-fg">Se déconnecter</button></form>
      </aside>
      <div className="min-w-0 flex-[999_1_560px]">{children}</div>
    </div>
  );
}
