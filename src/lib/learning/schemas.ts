import { z } from "zod";

export const progressSchema = z.object({
  lessonId: z.string().uuid(),
  position: z.number().int().min(0).max(60 * 60 * 24),
  completed: z.boolean().optional().default(false),
});

export const noteSchema = z.object({ lessonId: z.string().uuid(), body: z.string().trim().min(1).max(4000), position: z.number().int().min(0).optional() });
export const bookmarkSchema = z.object({ lessonId: z.string().uuid(), position: z.number().int().min(0), label: z.string().trim().max(200).optional() });
export const quizAnswersSchema = z.record(z.string().uuid(), z.union([z.array(z.string().uuid()).max(20), z.string().max(5000)]));
