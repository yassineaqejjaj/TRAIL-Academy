import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page introuvable</h1>
      <p className="mt-3 text-muted">Cette page n'existe pas ou a été déplacée.</p>
      <div className="mt-8"><ButtonLink href="/">Retour à l'accueil</ButtonLink></div>
    </Container>
  );
}
