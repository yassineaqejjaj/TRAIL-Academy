import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Chrome } from "@/components/layout/chrome";
import { Footer } from "@/components/layout/footer";
import { site } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  description: "Formations concrètes pour comprendre, utiliser et piloter l'intelligence artificielle dans votre environnement professionnel.",
  openGraph: { type: "website", siteName: site.name, locale: site.locale },
};

// Applies the saved theme before first paint to avoid a flash. Static string, no user input.
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-3">Aller au contenu</a>
        <Chrome hideOn={["/apprendre", "/admin", "/compte"]}><Header /></Chrome>
        <main id="main" className="flex-1">{children}</main>
        <Chrome hideOn={["/apprendre", "/admin", "/compte"]}><Footer /></Chrome>
      </body>
    </html>
  );
}
