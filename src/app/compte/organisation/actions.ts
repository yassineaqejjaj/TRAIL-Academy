"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function leaveOrganization(fd: FormData) {
  const user = await requireUser();
  const org = z.string().uuid().safeParse(fd.get("org"));
  if (!org.success) redirect("/compte/organisation");
  await asUser(user.id, (q) => q("select leave_organization($1)", [org.data]));
  redirect("/compte/organisation?ok=" + encodeURIComponent("Partage arrêté : vous avez quitté l'organisation et les licences qu'elle vous avait attribuées sont retirées."));
}
