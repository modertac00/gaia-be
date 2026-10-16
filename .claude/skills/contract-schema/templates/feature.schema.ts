// src/gaia/<feature>.schema.ts — request schemas + inferred Dto types.
import { z } from "zod";
import { RESEARCH_LIMITS, researchStatusSchema, researchTypeSchema } from "./common/research";
import { cursorPageQuerySchema } from "./pagination.contract";

export const createResearchSchema = z
  .object({
    title: z.string().trim().min(1).max(RESEARCH_LIMITS.TITLE_MAX),
    topic: z.string().trim().min(1).max(RESEARCH_LIMITS.TOPIC_MAX),
    researchType: researchTypeSchema,
    scopeNotes: z.string().trim().max(RESEARCH_LIMITS.SCOPE_NOTES_MAX).default(""),
  })
  .strict();

export type CreateResearchDto = z.infer<typeof createResearchSchema>;

export const updateResearchSchema = createResearchSchema.partial().strict();

export type UpdateResearchDto = z.infer<typeof updateResearchSchema>;

export const listResearchQuerySchema = cursorPageQuerySchema.extend({
  status: researchStatusSchema.optional(),
  researchType: researchTypeSchema.optional(),
  search: z.string().trim().min(1).max(RESEARCH_LIMITS.TITLE_MAX).optional(),
});

export type ListResearchQuery = z.infer<typeof listResearchQuerySchema>;
