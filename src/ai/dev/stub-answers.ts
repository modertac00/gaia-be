import {
  SOURCE_CONTENT_LEVEL,
  type NoteSectionEditResult,
  type NoteSectionEditTaskInput,
  type SourceQuestionAnswer,
  type SourceQuestionTaskInput,
} from '@moderta/api-contracts/gaia'

export function stubSourceAnswer(input: SourceQuestionTaskInput): SourceQuestionAnswer {
  return {
    researchId: input.researchId,
    questionId: input.questionId,
    answer: 'This is a stub answer. The AI service is not connected, so the source was not read.',
    pages: [],
    contentLevel: SOURCE_CONTENT_LEVEL.METADATA_ONLY,
  }
}

export function stubNoteSectionEdit(input: NoteSectionEditTaskInput): NoteSectionEditResult {
  return {
    researchId: input.researchId,
    editId: input.editId,
    proposalNumber: 1,
    content: `Stub proposal for ${input.section.heading}. The AI service is not connected.`,
    citations: [],
    unsupported: [],
    assistantMessage: 'This is a stub proposal.',
  }
}
