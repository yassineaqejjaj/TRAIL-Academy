import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-wrap items-start text-[15px]">
      <nav aria-label="Administration" className="flex min-w-[220px] flex-[0_1_260px] flex-col gap-1 border-r border-border bg-surface p-6 lg:sticky lg:top-0 lg:min-h-screen">
        <Link href="/admin" className="mb-6 flex items-baseline gap-2"><span className="font-display text-[22px] font-bold tracking-[0.04em]">TRAIL</span><span className="text-[13px] font-medium text-muted">Admin</span></Link>
        <AdminNav />
        <div className="mt-auto flex items-center justify-between gap-2 pt-8"><Link href="/" className="text-sm text-muted hover:text-fg">Voir le site public</Link><ThemeToggle /></div>
      </nav>
      <div className="min-w-0 flex-[999_1_640px] p-6 sm:p-8">{children}</div>
    </div>
  );
}
