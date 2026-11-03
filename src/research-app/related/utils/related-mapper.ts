import type { PublicationYearCount, RelatedPapers } from '@moderta/api-contracts/gaia'
import type { ReadingListRecord, SourceLinkRecord } from '@/research-app/related/interfaces/related-repository.interface'

export function toRelatedPapers(
  links: SourceLinkRecord[],
  readingList: ReadingListRecord[],
  timeline: PublicationYearCount[],
): RelatedPapers {
  return { links, readingList, timeline }
}
