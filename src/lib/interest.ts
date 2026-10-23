import { z } from "zod";

export const interestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  kind: z.enum(["course_launch", "newsletter"]),
  courseSlug: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  consent: z.literal(true, { error: "Le consentement est requis." }),
  website: z.string().max(500).optional(), // honeypot
}).refine((v) => v.kind !== "course_launch" || !!v.courseSlug, { message: "Module requis", path: ["courseSlug"] });
export type InterestInput = z.infer<typeof interestSchema>;

/** Bump when the privacy notice changes so consent stays attributable to the text the person saw. */
export const CONSENT_POLICY_VERSION = "draft-1";
