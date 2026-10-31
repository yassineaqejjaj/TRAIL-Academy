"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AccountNav({ links }: { links: [string, string][] }) {
  const pathname = usePathname();
  return <>{links.map(([href, label]) => {
    const active = pathname === href;
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`shrink-0 whitespace-nowrap rounded-2xl px-3.5 py-3 text-sm ${active ? "bg-tint font-semibold text-fg" : "text-muted hover:bg-tint hover:text-fg"}`}>{label}</Link>;
  })}</>;
}
