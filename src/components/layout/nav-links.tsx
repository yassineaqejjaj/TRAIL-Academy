"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/lib/site";

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <>
      {nav.map((n) => {
        const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`py-2.5 text-[15px] ${active ? "font-semibold text-accent" : "font-medium text-fg hover:text-accent"} ${className ?? ""}`}>{n.label}</Link>;
      })}
    </>
  );
}
