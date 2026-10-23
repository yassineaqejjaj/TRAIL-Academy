export const site = {
  name: "TRAIL Academy",
  fullName: "Training Roadmap for Applied Intelligence & Leadership",
  tagline: "Learn AI. Apply AI. Lead with AI.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  locale: "fr_FR",
};

export const nav = [
  { href: "/formations", label: "Formations" },
  { href: "/parcours", label: "Parcours" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/entreprise", label: "Entreprises" },
  { href: "/ressources", label: "Ressources" },
  { href: "/formateur", label: "Formateur" },
];

export const legalPages = [
  { slug: "mentions-legales", title: "Mentions légales" },
  { slug: "confidentialite", title: "Politique de confidentialité" },
  { slug: "cookies", title: "Politique de cookies" },
  { slug: "conditions-de-vente", title: "Conditions générales de vente" },
  { slug: "conditions-utilisation", title: "Conditions d'utilisation" },
  { slug: "accessibilite", title: "Déclaration d'accessibilité" },
  { slug: "remboursement", title: "Rétractation et annulation" },
];
