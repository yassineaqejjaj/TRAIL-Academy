import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/** Sticky glass pill, as in the refreshed design. The primary action stays "Trouver mon parcours". */
export function Header() {
  return (
    <header className="sticky top-0 z-30 px-4 py-3 sm:px-8 sm:py-4">
      <div className="glass glass-blur mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[28px] py-2 pl-5 pr-2 elevated lg:flex-nowrap lg:rounded-full">
        <Link href="/" aria-label="TRAIL Academy, accueil" className="flex shrink-0 items-center transition-opacity hover:opacity-80"><Logo height={40} priority /></Link>
        <nav aria-label="Navigation principale" className="order-3 flex w-full gap-5 overflow-x-auto lg:order-none lg:w-auto lg:overflow-visible"><NavLinks className="shrink-0" /></nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/connexion" className="hidden min-h-11 items-center px-4 text-[15px] font-medium sm:inline-flex">Connexion</Link>
          <Link href="/conseiller" className="cta-glow inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-fg">Trouver mon parcours</Link>
        </div>
      </div>
    </header>
  );
}
