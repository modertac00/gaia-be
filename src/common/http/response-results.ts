import type { CursorPage } from '@moderta/api-contracts/gaia'

export class ListResult<T> {
  constructor(
    readonly items: T[],
    readonly limit: number,
    readonly nextCursor: string | null,
  ) { }
}

export const paginated = <T>(page: CursorPage<T>, limit: number) => new ListResult(page.items, limit, page.nextCursor)

export class WithMeta<T> {
  constructor(
    readonly data: T,
    readonly meta: Record<string, unknown>,
  ) { }
}

export const withMeta = <T>(data: T, meta: Record<string, unknown>) => new WithMeta(data, meta)
