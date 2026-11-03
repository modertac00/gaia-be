import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, CHAT_ROLE, type NoteChatResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { NOTES_REPOSITORY } from '@/research-app/notes/interfaces/notes-repository.interface'
import { NotesRepository } from '@/research-app/notes/repositories/notes.repository'
import { NOTE_CHAT_FAILED_MESSAGE } from '@moderta/api-contracts/gaia'

@Injectable()
export class NoteChatHandler implements AiResponseHandler<typeof AI_RUN_KIND.NOTE_CHAT>, OnModuleInit {
  readonly kind = AI_RUN_KIND.NOTE_CHAT

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(NOTES_REPOSITORY) private readonly repository: NotesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  async onSucceeded(messageId: string, result: NoteChatResult): Promise<void> {
    const question = await this.repository.findChatMessage(messageId)
    if (!question || (await this.repository.hasChatReply(messageId))) return

    await this.transactions.run(async (options) => {
      await this.repository.addChatMessage(
        { noteId: question.noteId, role: CHAT_ROLE.ASSISTANT, message: result.reply, llmRunId: messageId },
        options,
      )
      if (result.sectionProposal) await this.repository.createProposal(question.noteId, result.sectionProposal, options)
    })
  }

  async onFailed(messageId: string): Promise<void> {
    const question = await this.repository.findChatMessage(messageId)
    if (!question || (await this.repository.hasChatReply(messageId))) return

    await this.repository.addChatMessage({
      noteId: question.noteId,
      role: CHAT_ROLE.ASSISTANT,
      message: NOTE_CHAT_FAILED_MESSAGE,
      llmRunId: messageId,
      metadata: { failed: true },
    })
  }
}
