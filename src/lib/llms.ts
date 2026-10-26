import { difficultyLabel, formatEuro, type Catalog } from "@/lib/catalog";
import type { Post } from "@/lib/cms";
import { generalFaq } from "@/lib/faq-data";
import { abs, instructorProfile } from "@/lib/seo";
import { site } from "@/lib/site";

/** Plain-text summaries for AI assistants (llmstxt.org convention). Built only from public catalogue data. */
export function llmsTxt(catalog: Catalog, posts: Post[]): string {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.name} est une plateforme française de formation en ligne à l'intelligence artificielle pour les professionnels du produit et de la tech : ${catalog.courses.length} modules, 2 parcours, quiz, ateliers no-code et low-code, livrables relus par le formateur. Formateur unique : ${instructorProfile.name}.`,
    "",
    "## Pages principales",
    `- [Formations](${abs("/formations")}): catalogue des modules`,
    `- [Parcours](${abs("/parcours")}): Product Manager Augmenté, AI Product Manager, AI Mastery`,
    `- [Tarifs](${abs("/tarifs")}): module 199 € TTC, parcours 990 € TTC, AI Mastery 1 990 € TTC`,
    `- [Questions fréquentes](${abs("/faq")}): prix, accès, prérequis, attestation`,
    `- [Le formateur](${abs("/formateur")}): ${instructorProfile.name}`,
    `- [Sessions en direct](${abs("/sessions")}): ateliers et questions-réponses en visio`,
    `- [Entreprises](${abs("/entreprise")}): formations sur mesure sur devis`,
    "",
    "## Modules",
    ...catalog.courses.map((c) => `- [${c.code} ${c.title}](${abs(`/formations/${c.slug}`)}): ${c.summary}`),
  ];
  if (posts.length) lines.push("", "## Articles", ...posts.map((p) => `- [${p.title}](${abs(`/ressources/${p.slug}`)})${p.excerpt ? `: ${p.excerpt}` : ""}`));
  lines.push("", "## Optionnel", `- [Flux RSS](${abs("/ressources/feed.xml")})`, `- [Version complète pour les assistants](${abs("/llms-full.txt")})`, "");
  return lines.join("\n");
}

export function llmsFullTxt(catalog: Catalog, posts: Post[]): string {
  const out = [llmsTxt(catalog, posts), "---", "", "# Détail des modules", ""];
  for (const c of catalog.courses) {
    const price = catalog.coursePrices[c.slug] ?? catalog.offers.find((o) => o.slug === "module")?.amountCents ?? null;
    out.push(`## ${c.code} — ${c.title}`, "", c.summary, "",
      `- Durée estimée : ${c.durationHours} h · Niveau : ${difficultyLabel[c.difficulty]}${price != null ? ` · Prix : ${formatEuro(price)} TTC` : ""}`,
      ...(c.outcomes.length ? ["- À l'issue du module :", ...c.outcomes.map((o) => `  - ${o}`)] : []),
      ...(c.topics.length ? [`- Thèmes : ${c.topics.join(", ")}`] : []),
      c.deliverable ? `- Livrable : ${c.deliverable}` : "", `- Page : ${abs(`/formations/${c.slug}`)}`, "");
  }
  out.push("# Questions fréquentes", "", ...generalFaq.flatMap((f) => [`**${f.q}**`, f.a, ""]));
  return out.filter((l) => l !== undefined).join("\n");
}
