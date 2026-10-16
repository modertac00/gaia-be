import { z } from "zod";

export const GAIA_PAGINATION_LIMITS = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 25,
} as const;

export const cursorPageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(GAIA_PAGINATION_LIMITS.MIN_LIMIT)
    .max(GAIA_PAGINATION_LIMITS.MAX_LIMIT)
    .default(GAIA_PAGINATION_LIMITS.DEFAULT_LIMIT),
});

export type CursorPageQuery = z.infer<typeof cursorPageQuerySchema>;

export const cursorPageSchema = <TItem extends z.ZodType>(item: TItem) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export interface CursorPage<TItem> {
  items: TItem[];
  nextCursor: string | null;
}

export const uuidParamSchema = z.uuid();
