import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Chrome } from "@/components/layout/chrome";
import { Footer } from "@/components/layout/footer";
import { LaunchBanner } from "@/components/layout/launch-banner";
import { JsonLd } from "@/components/json-ld";
import { siteGraph } from "@/lib/seo";
import { site } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  description: "Formations concrètes pour comprendre, utiliser et piloter l'intelligence artificielle dans votre environnement professionnel.",
  applicationName: site.name,
  authors: [{ name: "Yassine Aqejjaj", url: `${site.url}/formateur` }],
  creator: "Yassine Aqejjaj",
  publisher: site.name,
  keywords: ["formation IA", "formation intelligence artificielle", "AI Product Manager", "Product Manager augmenté", "IA générative", "IA agentique", "RAG", "prompt engineering", "AI Act", "formation no-code IA"],
  alternates: { types: { "application/rss+xml": "/ressources/feed.xml" } }, // canonical is set per page: a site-wide one would be inherited by every page
  openGraph: { type: "website", siteName: site.name, locale: site.locale },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION, other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

// Applies the saved theme before first paint to avoid a flash. Static string, no user input.
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <JsonLd data={siteGraph()} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-3">Aller au contenu</a>
        <Chrome hideOn={["/apprendre", "/admin", "/compte"]}><LaunchBanner /><Header /></Chrome>
        <main id="main" className="flex-1">{children}</main>
        <Chrome hideOn={["/apprendre", "/admin", "/compte"]}><Footer /></Chrome>
      </body>
    </html>
  );
}
