import type { ClassificationHistoryEntry, Source, SourceQuestion } from '@moderta/api-contracts/gaia'
import type { ClassificationHistoryRecord, SourceQuestionRecord, SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'

export function toSource(record: SourceRecord): Source {
  return {
    ...record,
    verifiedAt: record.verifiedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function toClassificationHistoryEntry(record: ClassificationHistoryRecord): ClassificationHistoryEntry {
  return { ...record, createdAt: record.createdAt.toISOString() }
}

export function toSourceQuestion({ id, question, answer, pages, contentLevel, status }: SourceQuestionRecord): SourceQuestion {
  return { questionId: id, question, answer, pages, contentLevel, status }
}
