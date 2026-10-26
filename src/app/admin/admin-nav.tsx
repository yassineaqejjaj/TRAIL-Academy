"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "Tableau de bord"], ["/admin/cours", "Cours"], ["/admin/parcours", "Parcours"], ["/admin/produits", "Produits et prix"],
  ["/admin/coupons", "Coupons"], ["/admin/commandes", "Commandes"], ["/admin/apprenants", "Apprenants"], ["/admin/devoirs", "Relecture"], ["/admin/avis", "Avis"], ["/admin/sessions", "Sessions en visio"], ["/admin/entreprises", "Entreprises"],
  ["/admin/cms", "Contenu du site"], ["/admin/journal", "Journal d'audit"], ["/admin/production", "Mise en production"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
        return <li key={href}><Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-[15px] ${active ? "bg-accent-soft font-semibold text-fg" : "font-medium text-muted hover:bg-surface-2 hover:text-fg"}`}>{label}</Link></li>;
      })}
    </ul>
  );
}
