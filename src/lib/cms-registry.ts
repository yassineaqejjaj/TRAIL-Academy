import { legalPages } from "./site";

export type SectionField = "title" | "subtitle" | "bodyMd";
export interface EditableSection { page: string; pageTitle: string; key: string; label: string; fields: SectionField[]; legal?: boolean }

/** Every text block editable from the admin, in one place. Public pages fall back to built-in copy when a block is empty. */
export const editableSections: EditableSection[] = [
  { page: "accueil", pageTitle: "Accueil", key: "hero", label: "Bandeau d'accueil (titre et sous-titre)", fields: ["title", "subtitle"] },
  { page: "formateur", pageTitle: "Formateur", key: "profil", label: "Profil du formateur (nom, accroche, biographie)", fields: ["title", "subtitle", "bodyMd"] },
  ...legalPages.map((l) => ({ page: `legal-${l.slug}`, pageTitle: l.title, key: "corps", label: `${l.title} (texte)`, fields: ["bodyMd"] as SectionField[], legal: true })),
];
