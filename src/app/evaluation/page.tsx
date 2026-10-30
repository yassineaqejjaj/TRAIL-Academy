import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Container } from "@/components/ui";
import { recommend } from "@/lib/advisor/engine";
import { roles } from "@/lib/advisor/rules";
import { getCatalog } from "@/lib/catalog/load";
import { breadcrumbLd } from "@/lib/seo";
import { Assessment, type RoleOption } from "./assessment";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Évaluez votre niveau en IA : AI Skills Assessment",
  description: "15 questions en 5 minutes pour estimer votre niveau en IA, repérer vos points à travailler et obtenir un parcours recommandé. Gratuit, sans inscription, vos réponses ne sont pas enregistrées.",
  alternates: { canonical: "/evaluation" },
};

const offered = ["product", "project", "analyst", "engineering", "management", "marketing", "hr", "legal", "finance", "other"] as const;

export default async function AssessmentPage() {
  const catalog = await getCatalog();
  const options: RoleOption[] = offered.map((value) => {
    const rec = recommend({ role: value, objective: "use", familiarity: "user", technical: "medium", experience: "mid", hoursPerWeek: 3 }, catalog);
    return { value, label: roles.find((r) => r.value === value)!.label, pathSlug: rec.pathSlug, pathTitle: rec.pathTitle };
  });
  const modules = catalog.courses.map((c) => ({ code: c.code, title: c.title, slug: c.slug }));
  return (
    <Container className="max-w-3xl py-12">
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Évaluation de niveau", path: "/evaluation" }])} />
      <h1 className="display-light text-4xl sm:text-5xl">AI Skills Assessment</h1>
      <p className="mt-3 text-muted">Un test gratuit pour situer votre niveau et choisir par où commencer. Sans inscription, sans e-mail.</p>
      <div className="mt-8"><Assessment roles={options} modules={modules} /></div>
    </Container>
  );
}
