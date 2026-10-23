import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="border-b border-border bg-bg">
      <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
        <Link href="/" className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-fg">
          <span className="font-display text-2xl font-bold tracking-[0.04em]">TRAIL</span>
          <span className="text-sm font-medium text-muted">Academy</span>
        </Link>
        <nav aria-label="Navigation principale" className="order-3 flex w-full gap-6 overflow-x-auto md:order-none md:w-auto md:overflow-visible"><NavLinks className="shrink-0" /></nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/connexion" className="hidden px-3 py-3 text-[15px] font-medium sm:block">Connexion</Link>
          <ButtonLink href="/conseiller" className="min-h-0 whitespace-nowrap px-5 py-3 text-[15px]">Trouver mon parcours</ButtonLink>
        </div>
      </Container>
    </header>
  );
}
