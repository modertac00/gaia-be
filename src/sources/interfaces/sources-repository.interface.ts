import type {
  ClassificationHistoryEntry,
  ListSourcesQuery,
  Source,
  SourceQuestion,
  SourceQuestionAnswer,
  SourceStance,
} from '@moderta/api-contracts/gaia'

export const SOURCES_REPOSITORY = Symbol('SOURCES_REPOSITORY')

export type SourceRecord = Omit<Source, 'verifiedAt' | 'createdAt' | 'updatedAt'> & {
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ClassificationHistoryRecord = Omit<ClassificationHistoryEntry, 'createdAt'> & { createdAt: Date }

export type SourceQuestionRecord = Omit<SourceQuestion, 'questionId'> & { id: string; createdAt: Date }

export interface NewSourceAnswer extends SourceQuestionAnswer {
  questionId: string
  llmRunId: string
}

export type SourceListFilter = Pick<ListSourcesQuery, 'stance' | 'verified' | 'included'>

export interface NewClassificationEntry {
  researchId: string
  sourceId: string
  fromStance: SourceStance | null
  toStance: SourceStance
  reason: string | null
  changedBy: string
}
