// src/gaia/<feature>.contract.ts — response schemas + types clients consume.
import { z } from "zod";
import { researchStatusSchema, researchTypeSchema } from "./common/research";
import { cursorPageSchema } from "./pagination.contract";

export const researchSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  topic: z.string(),
  researchType: researchTypeSchema,
  status: researchStatusSchema,
  scopeNotes: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Research = z.infer<typeof researchSchema>;

export const researchPageSchema = cursorPageSchema(researchSchema);

export type ResearchPage = z.infer<typeof researchPageSchema>;

// Detail views extend, never re-declare:
export const researchDetailSchema = researchSchema.extend({
  paperCount: z.number().int().nonnegative(),
  chatCount: z.number().int().nonnegative(),
});

export type ResearchDetail = z.infer<typeof researchDetailSchema>;
