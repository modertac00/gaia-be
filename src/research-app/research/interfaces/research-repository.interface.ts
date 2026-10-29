import type { ListResearchQuery, Research } from '@moderta/api-contracts/gaia'


export const RESEARCH_REPOSITORY = Symbol('RESEARCH_REPOSITORY')

export type ResearchRecord = Omit<Research, 'createdAt' | 'updatedAt'> & {
  createdAt: Date
  updatedAt: Date
}

export type NewResearch = Omit<
  ResearchRecord,
  'id' | 'docKey' | 'approvedByUserId' | 'counts' | 'verifiedSourceCount' | 'supervisorIds' | 'createdAt' | 'updatedAt'
>

export type ResearchChanges = Partial<
  Omit<NewResearch, 'status' | 'createdBy'>
>

export type ResearchListFilter = Pick<ListResearchQuery, 'status' | 'researchType' | 'search'>

/** Changes to the research's source counters; negative values decrease them (never below zero). */
export interface SourceCounterDeltas {
  verified?: number
  excluded?: number
  included?: number
}
