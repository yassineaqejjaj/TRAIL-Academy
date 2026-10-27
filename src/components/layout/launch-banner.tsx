import Link from "next/link";

/** Shown on every public page until the owner sets NEXT_PUBLIC_SALES_OPEN=true at launch. */
export function LaunchBanner() {
  if (process.env.NEXT_PUBLIC_SALES_OPEN === "true") return null;
  return (
    <div className="bg-band text-band-fg">
      <p className="mx-auto max-w-[1200px] px-4 py-2 text-center text-sm sm:px-6">
        Les inscriptions ouvrent bientôt. <Link href="/ouverture" className="font-semibold underline underline-offset-2">Être informé de l'ouverture</Link>
      </p>
    </div>
  );
}
