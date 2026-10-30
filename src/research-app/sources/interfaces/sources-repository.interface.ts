import type {
  ClassificationHistoryEntry,
  ListSourcesQuery,
  Source,
  SourceQuestion,
  SourceStance,
  SourceTier,
} from '@moderta/api-contracts/gaia'

export const SOURCES_REPOSITORY = Symbol('SOURCES_REPOSITORY')

export type SourceRecord = Omit<Source, 'verifiedAt' | 'createdAt' | 'updatedAt'> & {
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ClassificationHistoryRecord = Omit<ClassificationHistoryEntry, 'createdAt'> & { createdAt: Date }

export type SourceQuestionRecord = Omit<SourceQuestion, 'questionId'> & { id: string; createdAt: Date }

export type SourceListFilter = Pick<ListSourcesQuery, 'stance' | 'verified' | 'included'>

/** A paper the AI selected for a research. The id is the AI's paperId, which is our source id. */
export interface AiPaper {
  id: string
  marker: number
  title: string
  authors: string[]
  venue: string | null
  publicationYear: number | null
  doi: string | null
  url: string | null
  citedByCount: number
  tier: SourceTier
}

export interface NewClassificationEntry {
  researchId: string
  sourceId: string
  fromStance: SourceStance | null
  toStance: SourceStance
  reason: string | null
  changedBy: string
}
