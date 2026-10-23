import "server-only";
import { asService } from "@/lib/db";
import { EXPECTED_MIGRATION, type Check } from "@/lib/readiness";
import { storageHealth } from "@/lib/storage";

async function timed<T>(fn: () => Promise<T>, ms = 4000): Promise<T> {
  return await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

/** Checks that actually talk to the database, the object storage and the video gateway. Read-only. */
export async function liveChecks(): Promise<Check[]> {
  const out: Check[] = [];
  const add = (id: string, label: string, status: Check["status"], detail: string) => out.push({ id, group: "Vérifications en direct", label, status, detail });

  try {
    const rows = await timed(() => asService((q) => q<{ name: string }>("select name from auth.schema_migrations order by name")));
    const last = rows.at(-1)?.name ?? "aucune";
    add("db_migrations", "Migrations appliquées", last === EXPECTED_MIGRATION ? "ok" : "fail", last === EXPECTED_MIGRATION ? `${rows.length} migrations, dernière : ${last}.` : `Dernière appliquée : ${last}, attendue : ${EXPECTED_MIGRATION}. Lancez npm run db:migrate.`);
    const data = await timed(() => asService((q) => q.one<{ admins: number; published: number; sellable: number; videos: number; legal: number }>(
      `select (select count(*) from user_roles where role = 'admin')::int admins,
              (select count(*) from courses where status = 'published')::int published,
              (select count(*) from products p where p.active and p.kind = 'course')::int sellable,
              (select count(*) from lessons l join courses c on c.id = l.course_id where c.status = 'published' and l.video_provider is not null and l.video_asset_id is not null)::int videos,
              (select count(*) from pages p join page_sections s on s.page_id = p.id where p.slug like 'legal-%' and p.status = 'published' and s.key = 'corps' and coalesce(s.content->>'body_md', '') <> '')::int legal`)));
    add("content_admin", "Compte administrateur", (data?.admins ?? 0) > 0 ? "ok" : "fail", `${data?.admins ?? 0} administrateur(s).`);
    add("content_published", "Modules publiés", (data?.published ?? 0) > 0 ? "ok" : "warn", `${data?.published ?? 0} module(s) publié(s) ; ${data?.sellable ?? 0} offre(s) module active(s). Sans module publié et offre active, rien n'est à vendre.`);
    add("content_videos", "Leçons vidéo des modules publiés", (data?.videos ?? 0) > 0 ? "ok" : "warn", `${data?.videos ?? 0} leçon(s) avec une vidéo rattachée.`);
    add("content_legal", "Pages légales publiées", (data?.legal ?? 0) >= 7 ? "ok" : "fail", `${data?.legal ?? 0} / 7 page(s) légale(s) publiée(s) depuis l'administration. Elles doivent être complétées et relues par un juriste.`);
  } catch (e) {
    add("db_migrations", "Base de données", "fail", `Inaccessible ou schéma incomplet (${e instanceof Error ? e.message : "erreur"}).`);
  }

  const s = await timed(() => storageHealth()).catch(() => "unreachable" as const);
  add("storage", "Stockage S3", s === "ok" ? "ok" : s === "not_configured" ? "fail" : "fail", s === "ok" ? "Le bucket répond." : s === "not_configured" ? "Non configuré." : "Le bucket ne répond pas (identifiants, endpoint ou nom du bucket).");

  const gw = process.env.STREAM_GATEWAY_URL;
  if (!gw) add("gateway", "Passerelle de streaming", "fail", "Non configurée.");
  else {
    const ok = await timed(async () => (await fetch(new URL("/healthz", gw), { cache: "no-store" })).ok).catch(() => false);
    add("gateway", "Passerelle de streaming", ok ? "ok" : "fail", ok ? "/healthz répond." : "/healthz ne répond pas.");
  }
  return out;
}
