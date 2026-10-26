import Link from "next/link";
import { legalPages, site } from "@/lib/site";
import { Container } from "@/components/ui";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-bg">
      <Container className="flex flex-wrap justify-between gap-6 py-12 text-sm text-muted">
        <div className="max-w-md">
          <p className="font-semibold text-fg">{site.name} : {site.fullName}</p>
          <p className="mt-2">{site.tagline}</p>
          <p className="mt-4 text-xs">Les attestations délivrées sont privées et ne constituent ni une certification d'État ni une qualification RNCP.</p>
        </div>
        <nav aria-label="Informations légales"><ul className="flex flex-wrap gap-x-5 gap-y-2"><li><Link href="/faq" className="hover:text-fg">Questions fréquentes</Link></li><li><Link href="/ressources/feed.xml" className="hover:text-fg">Flux RSS</Link></li>{legalPages.map((l) => <li key={l.slug}><Link href={`/legal/${l.slug}`} className="hover:text-fg">{l.title}</Link></li>)}</ul></nav>
      </Container>
    </footer>
  );
}
