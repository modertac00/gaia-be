import { Injectable, Logger } from '@nestjs/common'
import { SOURCE_CONTENT_LEVEL, type SourceQuestionAnswer } from '@moderta/api-contracts/gaia'
import type { AiClient, AnswerSourceQuestionInput } from '@/ai/interfaces/ai-client.interface'

const ABSTRACT_EXCERPT_MAX = 280


@Injectable()
export class StubAiClient implements AiClient {
  private readonly logger = new Logger(StubAiClient.name)

  constructor() {
    this.logger.warn('AI service is not connected: source questions are answered by a stub')
  }

  answerSourceQuestion({ source }: AnswerSourceQuestionInput): Promise<SourceQuestionAnswer> {
    const abstract = source.contentSummarization?.trim()

    if (!abstract) {
      return Promise.resolve({
        answer: 'I cannot answer from the metadata alone. Upload the PDF of this source and ask again.',
        pages: [],
        contentLevel: SOURCE_CONTENT_LEVEL.METADATA_ONLY,
      })
    }

    const excerpt = abstract.length > ABSTRACT_EXCERPT_MAX ? `${abstract.slice(0, ABSTRACT_EXCERPT_MAX).trimEnd()}…` : abstract
    return Promise.resolve({
      answer: `This answer is based on the abstract only, so I cannot give page-level detail. The abstract says: “${excerpt}”`,
      pages: [],
      contentLevel: SOURCE_CONTENT_LEVEL.ABSTRACT,
    })
  }
}
