import type { AiError, ClarificationDraft, ClarificationResult, RequestClarificationDto } from '@moderta/api-contracts/gaia'

export const CLARIFICATIONS_REPOSITORY = Symbol('CLARIFICATIONS_REPOSITORY')

export interface ClarificationRecord {
  id: string
  createdBy: string
  status: ClarificationDraft['status']
  brief: RequestClarificationDto
  suggestedQuestion: ClarificationDraft['suggestedQuestion']
  questions: ClarificationDraft['questions']
  error: AiError | null
}

export interface ClarificationsRepositoryPort {
  createPending(userId: string, brief: RequestClarificationDto): Promise<ClarificationRecord>
  findOwned(userId: string, clarificationId: string): Promise<ClarificationRecord | null>
  delete(clarificationId: string): Promise<void>
  saveReady(clarificationId: string, result: Pick<ClarificationResult, 'suggestedQuestion' | 'questions'>): Promise<boolean>
  saveFailed(clarificationId: string, error: AiError): Promise<boolean>
}
