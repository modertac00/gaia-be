import type { ReadingListEntry, SourceLink } from '@moderta/api-contracts/gaia'

export const RELATED_REPOSITORY = Symbol('RELATED_REPOSITORY')

export type SourceLinkRecord = SourceLink

export type ReadingListRecord = ReadingListEntry

/** What the related-links handler needs to know about the research it locked. */
export interface LockedResearch {
  relatedLinksGeneratedAt: Date | null
}
