import type { ResearchLink } from '@moderta/api-contracts/gaia'
import type { ResearchLinkRecord } from '@/research-app/research-links/interfaces/research-links-repository.interface'

export function toResearchLink(record: ResearchLinkRecord): ResearchLink {
  return { ...record, createdAt: record.createdAt.toISOString() }
}
