import type { ClarificationDraft, RequestClarificationDto } from '@moderta/api-contracts/gaia'
import type { ClarificationRecord } from '@/research-app/clarifications/interfaces/clarifications-repository.interface'

export function toClarificationDraft(record: ClarificationRecord): ClarificationDraft {
  return {
    clarificationId: record.id,
    status: record.status,
    suggestedQuestion: record.suggestedQuestion,
    questions: record.questions,
    error: record.error,
  }
}

export function toClarificationTaskInput(clarificationId: string, brief: RequestClarificationDto) {
  return {
    researchId: clarificationId,
    researchType: brief.researchType,
    question: brief.question,
    citationStyle: brief.citationStyle,
    publicationYearFrom: brief.pubYearFrom,
    publicationYearTo: brief.pubYearTo,
    minSources: brief.minSources,
  }
}
