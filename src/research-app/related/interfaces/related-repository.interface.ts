import type { SourceLink } from '@moderta/api-contracts/gaia'
import type { SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'

export const RELATED_REPOSITORY = Symbol('RELATED_REPOSITORY')

export type SourceLinkRecord = SourceLink

export interface ReadingListRecord {
  rank: number
  source: SourceRecord
}

export interface NewReadingListEntry {
  sourceId: string
  rank: number
}
