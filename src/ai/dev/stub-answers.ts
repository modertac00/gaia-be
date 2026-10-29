import {
  SOURCE_CONTENT_LEVEL,
  type SourceQuestionAnswer,
  type SourceQuestionTaskInput,
} from '@moderta/api-contracts/gaia'

const ABSTRACT_EXCERPT_MAX = 280

export function stubSourceAnswer({ source }: SourceQuestionTaskInput): SourceQuestionAnswer {
  const abstract = source.contentSummarization?.trim()

  if (!abstract) {
    return {
      answer: 'I cannot answer from the metadata alone. Upload the PDF of this source and ask again.',
      pages: [],
      contentLevel: SOURCE_CONTENT_LEVEL.METADATA_ONLY,
    }
  }

  const excerpt = abstract.length > ABSTRACT_EXCERPT_MAX ? `${abstract.slice(0, ABSTRACT_EXCERPT_MAX).trimEnd()}…` : abstract
  return {
    answer: `This answer is based on the abstract only, so I cannot give page-level detail. The abstract says: “${excerpt}”`,
    pages: [],
    contentLevel: SOURCE_CONTENT_LEVEL.ABSTRACT,
  }
}
