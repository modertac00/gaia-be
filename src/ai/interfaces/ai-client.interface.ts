import type { Source, SourceQuestionAnswer } from '@moderta/api-contracts/gaia'

export const AI_CLIENT = Symbol('AI_CLIENT')

export interface AnswerSourceQuestionInput {
  question: string
  source: Source
  research: { title: string; description: string | null; scopeNotes: string }
}

export interface AiClient {
  answerSourceQuestion(input: AnswerSourceQuestionInput): Promise<SourceQuestionAnswer>
}
