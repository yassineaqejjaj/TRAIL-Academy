"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [["/compte", "Mon espace"], ["/formations", "Catalogue"], ["/compte/commandes", "Mes commandes"], ["/compte/donnees", "Mes données"]] as const;

export function AccountNav() {
  const pathname = usePathname();
  return <>{items.map(([href, label]) => {
    const active = pathname === href;
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`py-2.5 text-[15px] ${active ? "font-semibold text-accent" : "font-medium"}`}>{label}</Link>;
  })}</>;
}
