import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { AI_RUN_KIND, NOTE_PROPOSAL_STATUS, type NoteSectionEditResult } from '@moderta/api-contracts/gaia'
import { AiHandlers, type AiResponseHandler } from '@/ai/ai-handlers'
import { NOTES_REPOSITORY } from '@/research-app/notes/interfaces/notes-repository.interface'
import { NotesRepository } from '@/research-app/notes/repositories/notes.repository'

@Injectable()
export class NoteSectionEditHandler implements AiResponseHandler<typeof AI_RUN_KIND.NOTE_SECTION_EDIT>, OnModuleInit {
  readonly kind = AI_RUN_KIND.NOTE_SECTION_EDIT

  constructor(
    @Inject(AiHandlers) private readonly handlers: AiHandlers,
    @Inject(NOTES_REPOSITORY) private readonly repository: NotesRepository,
  ) { }

  onModuleInit(): void {
    this.handlers.register(this)
  }

  onSucceeded(proposalId: string, result: NoteSectionEditResult): Promise<void> {
    return this.repository.fillProposal(proposalId, result)
  }

  async onFailed(proposalId: string): Promise<void> {
    await this.repository.resolveProposal(proposalId, NOTE_PROPOSAL_STATUS.DISCARDED, null)
  }
}
