// src/common/database/cursor-pagination.ts — shared by every Sequelize repository list method.
// Order: created_at DESC, id DESC. Cursor is opaque base64url of "<iso>|<id>".
import { Op, type Order, type WhereOptions } from 'sequelize'

// Domain error (repositories never throw HTTP exceptions); HttpExceptionFilter maps it to 400.
export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid cursor')
  }
}

export interface CursorRecord {
  id: string
  createdAt: Date
}

export interface RecordPage<T> {
  records: T[]
  nextCursor: string | null
}

export const CURSOR_ORDER: Order = [
  ['createdAt', 'DESC'],
  ['id', 'DESC'],
]

export function encodeCursor(record: CursorRecord): string {
  return Buffer.from(`${record.createdAt.toISOString()}|${record.id}`).toString('base64url')
}

export function cursorWhere(cursor: string | undefined): WhereOptions {
  if (!cursor) return {}
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|')
  const createdAt = new Date(iso ?? '')
  if (!id || Number.isNaN(createdAt.getTime())) throw new InvalidCursorError()
  return {
    [Op.or]: [{ createdAt: { [Op.lt]: createdAt } }, { createdAt, id: { [Op.lt]: id } }],
  }
}

// Call with rows fetched using `limit: limit + 1`.
export function toRecordPage<T extends CursorRecord>(records: T[], limit: number): RecordPage<T> {
  const hasMore = records.length > limit
  const page = hasMore ? records.slice(0, limit) : records
  const last = page.at(-1)
  return { records: page, nextCursor: hasMore && last ? encodeCursor(last) : null }
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
