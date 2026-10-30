import Link from "next/link";

/** Shown on every public page until the owner sets NEXT_PUBLIC_SALES_OPEN=true at launch. */
export function LaunchBanner() {
  if (process.env.NEXT_PUBLIC_SALES_OPEN === "true") return null;
  return (
    <Link href="/ouverture" className="relative z-30 block border-b border-accent/25 bg-accent-soft px-4 py-2.5 text-center text-sm text-fg">
      <span aria-hidden className="pulse-dot mr-2.5 inline-block size-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
      Les inscriptions ouvrent bientôt. <strong className="text-accent">Être informé de l'ouverture →</strong>
    </Link>
  );
}
