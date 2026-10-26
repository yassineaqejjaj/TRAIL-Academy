import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink, Container } from "@/components/ui";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="border-b border-border bg-bg">
      <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
        <Link href="/" aria-label="TRAIL Academy, accueil" className="flex shrink-0 items-center"><Logo height={48} priority /></Link>
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
