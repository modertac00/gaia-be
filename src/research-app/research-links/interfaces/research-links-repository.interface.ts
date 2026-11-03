import type { ResearchLink } from '@moderta/api-contracts/gaia'

export const RESEARCH_LINKS_REPOSITORY = Symbol('RESEARCH_LINKS_REPOSITORY')

export type ResearchLinkRecord = Omit<ResearchLink, 'createdAt'> & { createdAt: Date }
