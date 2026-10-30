import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, NOTE_SECTION_ORIGIN, type AiError, type NoteSectionReadyResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { ResultNotReadyError } from '@/ai/result-not-ready'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { AppLogger } from '@/log'
import { NOTES_REPOSITORY } from '@/research-app/notes/interfaces/notes-repository.interface'
import { NotesRepository } from '@/research-app/notes/repositories/notes.repository'
import { applyAiDraft } from '@/research-app/notes/utils/note-section'

@Injectable()
export class NoteSectionReadyHandler implements AiResponseHandler<typeof AI_RUN_KIND.NOTE_SECTION_READY>, OnModuleInit {
  readonly kind = AI_RUN_KIND.NOTE_SECTION_READY

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(NOTES_REPOSITORY) private readonly repository: NotesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(taskId: string, result: NoteSectionReadyResult): Promise<void> {
    return this.transactions.run(async (options) => {
      const { researchId, noteId, sectionId } = result

      const note = await this.repository.findNoteById(noteId, options)
      if (!note) {
        const message = `Note section ${taskId}: note ${noteId} is not saved yet, it will be retried`
        this.logger.warn(message, NoteSectionReadyHandler.name)
        throw new ResultNotReadyError(message)
      }

      if (note.researchId !== researchId) {
        this.logger.warn(`Note section ${taskId}: note ${noteId} is not in research ${researchId}`, NoteSectionReadyHandler.name)
        return
      }

      const section = note.content.sections.find((item) => item.id === sectionId)
      if (!section) {
        this.logger.warn(`Note section ${taskId}: section ${sectionId} no longer exists in note ${noteId}`, NoteSectionReadyHandler.name)
        return
      }

      if (section.origin !== NOTE_SECTION_ORIGIN.AI_DRAFT) {
        this.logger.warn(`Note section ${taskId}: section ${sectionId} was already changed by a person, left as it is`, NoteSectionReadyHandler.name)
        return
      }

      if (section.content === result.content) {
        this.logger.debug(`Note section ${taskId}: section ${sectionId} already has this draft`, NoteSectionReadyHandler.name)
        return
      }

      const change = applyAiDraft(note.content, result, new Date())
      if (!change) {
        return
      }

      await this.repository.saveNoteContent(noteId, change.note, options)
    })
  }

  onFailed(taskId: string, error: AiError, researchId?: string): Promise<void> {
    const researchLabel = researchId ? researchId : 'unknown'
    const details = error.details ? JSON.stringify(error.details) : 'none'

    this.logger.warn(`Note section ${taskId} failed (${error.code}) for research ${researchLabel}, details: ${details}`, NoteSectionReadyHandler.name)
    return Promise.resolve()
  }

}
