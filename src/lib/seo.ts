import { site } from "@/lib/site";

/** Structured data (schema.org JSON-LD) builders. Pure functions: no I/O, easy to test, never emit undefined fields. */

export const abs = (path = "") => `${site.url.replace(/\/$/, "")}${path}`;
const ids = { org: () => abs("/#organization"), site: () => abs("/#website"), person: () => abs("/formateur#person") };

type Json = Record<string, unknown>;
/** Drops undefined, null and empty arrays so the output stays valid and compact. */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Json).filter(([, x]) => x !== undefined && x !== null && !(Array.isArray(x) && x.length === 0)).map(([k, x]) => [k, clean(x)])) as T;
  }
  return v;
}

export const instructorProfile = {
  name: "Yassine Aqejjaj",
  linkedin: "https://www.linkedin.com/in/yassine-aqejjaj/",
  jobTitle: "Formateur en IA appliquée et AI Product Management",
  knowsAbout: ["IA générative", "IA agentique", "AI Product Management", "Systèmes multi-agents", "Mise en production de solutions IA"],
};

export const organizationLd = (): Json => clean({
  "@type": "EducationalOrganization", "@id": ids.org(), name: site.name, alternateName: site.fullName, url: abs(), slogan: site.tagline,
  logo: { "@type": "ImageObject", url: abs("/brand/logo-light.png"), width: 720, height: 292 },
  description: "Formations en ligne à l'intelligence artificielle pour les professionnels du produit, de la tech et des fonctions métier (marketing, RH, juridique, finance) : 30 modules, 6 parcours, livrables relus par le formateur.",
  founder: { "@id": ids.person() }, areaServed: "FR", knowsLanguage: "fr",
  email: site.contactEmail || undefined, sameAs: [instructorProfile.linkedin],
});

export const websiteLd = (): Json => ({
  "@type": "WebSite", "@id": ids.site(), url: abs(), name: site.name, inLanguage: "fr-FR", publisher: { "@id": ids.org() },
});

export const personLd = (image?: string): Json => clean({
  "@type": "Person", "@id": ids.person(), name: instructorProfile.name, jobTitle: instructorProfile.jobTitle, url: abs("/formateur"),
  image, sameAs: [instructorProfile.linkedin], knowsAbout: instructorProfile.knowsAbout, worksFor: { "@id": ids.org() },
});

/** Site-wide graph, rendered once in the root layout. */
export const siteGraph = (): Json => ({ "@context": "https://schema.org", "@graph": [organizationLd(), websiteLd(), personLd(abs("/formateur/yassine-aqejjaj.webp"))] });

export const breadcrumbLd = (trail: { name: string; path: string }[]): Json => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: abs(t.path) })),
});

export const faqLd = (items: { q: string; a: string }[]): Json => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
});

export const itemListLd = (name: string, items: { name: string; path: string }[]): Json => ({
  "@context": "https://schema.org", "@type": "ItemList", name, numberOfItems: items.length,
  itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: abs(x.path) })),
});

export interface CourseLdInput {
  slug: string; code: string; title: string; summary: string; level: string; hours: number; outcomes: string[]; topics: string[]; prerequisites: string[];
  priceCents: number | null; accessMonths: number;
}
/** Course + CourseInstance (self-paced, online). Offer only when the module can really be bought; never any rating. */
export const courseLd = (c: CourseLdInput): Json => {
  const url = abs(`/formations/${c.slug}`);
  return clean({
    "@context": "https://schema.org", "@type": "Course", "@id": `${url}#course`, name: c.title, description: c.summary, url, inLanguage: "fr",
    courseCode: c.code, educationalLevel: c.level, timeRequired: `PT${Math.max(1, Math.round(c.hours))}H`, teaches: c.outcomes, about: c.topics.map((t) => ({ "@type": "Thing", name: t })),
    coursePrerequisites: c.prerequisites, isAccessibleForFree: false, provider: { "@id": ids.org() }, image: abs(`/formations/${c.slug}/opengraph-image`),
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${Math.max(1, Math.round(c.hours))}H`, instructor: { "@id": ids.person() }, inLanguage: "fr" },
    offers: c.priceCents != null ? { "@type": "Offer", category: "Paid", price: (c.priceCents / 100).toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock", url, priceValidUntil: undefined,
      eligibleDuration: { "@type": "QuantitativeValue", value: c.accessMonths, unitCode: "MON" } } : undefined,
  });
};

export interface ArticleLdInput { slug: string; title: string; description?: string | null; published?: string | null; body: string; category?: string | null }
export const articleLd = (a: ArticleLdInput): Json => clean({
  "@context": "https://schema.org", "@type": "BlogPosting", "@id": `${abs(`/ressources/${a.slug}`)}#article`, headline: a.title.slice(0, 110), description: a.description ?? undefined,
  datePublished: a.published ?? undefined, dateModified: a.published ?? undefined, inLanguage: "fr", articleSection: a.category ?? undefined,
  wordCount: a.body.split(/\s+/).filter(Boolean).length, image: abs(`/ressources/${a.slug}/opengraph-image`),
  author: { "@id": ids.person() }, publisher: { "@id": ids.org() }, mainEntityOfPage: abs(`/ressources/${a.slug}`), isPartOf: { "@type": "Blog", name: `${site.name} — Ressources`, url: abs("/ressources") },
});
