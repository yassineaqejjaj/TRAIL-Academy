import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(2).max(160),
  seats: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).max(100000).optional()),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(500).optional(), // honeypot: non-empty means bot, handled by the route
});
export type ContactInput = z.infer<typeof contactSchema>;
