"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function acceptInvitation(fd: FormData) {
  const user = await requireUser();
  const token = String(fd.get("token") ?? "");
  const back = `/equipe/invitation/${token}`;
  if (!/^[0-9a-f]{36}$/.test(token)) redirect(back);
  if (fd.get("consent") !== "on") redirect(`${back}?error=${encodeURIComponent("Cochez la case pour accepter le partage de votre progression.")}`);
  try {
    await asUser(user.id, (q) => q("select accept_org_invitation($1, true)", [token]));
  } catch {
    redirect(`${back}?error=${encodeURIComponent("Ce lien a déjà été utilisé, a expiré ou n'est pas valide.")}`);
  }
  redirect("/compte/organisation?ok=" + encodeURIComponent("Invitation acceptée."));
}
