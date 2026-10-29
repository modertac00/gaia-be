import type { PublicationYearCount, RelatedPapers } from '@moderta/api-contracts/gaia'
import type { ReadingListRecord, SourceLinkRecord } from '@/research-app/related/interfaces/related-repository.interface'
import { toSource } from '@/research-app/sources/utils/source-mapper'

export function toRelatedPapers(
  links: SourceLinkRecord[],
  readingList: ReadingListRecord[],
  timeline: PublicationYearCount[],
): RelatedPapers {
  return {
    links,
    readingList: readingList.map((entry) => ({ rank: entry.rank, source: toSource(entry.source) })),
    timeline,
  }
}
