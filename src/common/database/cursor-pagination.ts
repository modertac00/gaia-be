import { z } from 'zod'
import { uuidParamSchema } from '@moderta/api-contracts/gaia'

/** Order is always created_at DESC, id DESC; the cursor is opaque base64url of "<iso>|<id>". */
export interface CursorPosition {
  createdAt: Date
  id: string
}

export interface RecordPage<T> {
  records: T[]
  nextCursor: string | null
}

const isoInstantSchema = z.iso.datetime()

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(`${position.createdAt.toISOString()}|${position.id}`).toString('base64url')
}

/** Strict: exactly "<ISO-8601 instant>|<uuid>"; returns null for anything else so the caller can answer 400. */
export function decodeCursor(cursor: string): CursorPosition | null {
  const parts = Buffer.from(cursor, 'base64url').toString().split('|')
  if (parts.length !== 2) return null

  const [iso, id] = parts
  if (!isoInstantSchema.safeParse(iso).success || !uuidParamSchema.safeParse(id).success) return null

  return { createdAt: new Date(iso as string), id: id as string }
}

/** Call with rows fetched using `limit + 1`. */
export function toRecordPage<T extends CursorPosition>(records: T[], limit: number): RecordPage<T> {
  const hasMore = records.length > limit
  const page = hasMore ? records.slice(0, limit) : records
  const last = page.at(-1)

  return { records: page, nextCursor: hasMore && last ? encodeCursor(last) : null }
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
