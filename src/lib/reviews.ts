import { z } from "zod";

export const MIN_PUBLISHED_REVIEWS = 3; // the public section stays hidden until at least this many real reviews are published

export const reviewSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom").max(80),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  linkedin: z.string().trim().max(200).regex(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/, "Lien LinkedIn invalide (https://www.linkedin.com/in/…)").optional().or(z.literal("")),
  quote: z.string().trim().min(40, "Quelques phrases, 40 caractères minimum").max(1200, "1 200 caractères maximum"),
  consent: z.literal("on", { message: "Votre accord de publication est nécessaire" }),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
