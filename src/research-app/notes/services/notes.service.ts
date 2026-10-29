import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  AI_RUN_KIND,
  type AcceptNoteProposalDto,
  CHAT_ROLE,
  INVALID_CURSOR_MESSAGE,
  type ListNoteChatQuery,
  NOTE_NOT_FOUND_MESSAGE,
  NOTE_PROPOSAL_NOT_FOUND_MESSAGE,
  NOTE_PROPOSAL_NOT_PENDING_MESSAGE,
  NOTE_PROPOSAL_STATUS,
  NOTE_SECTION_NOT_FOUND_MESSAGE,
  CHAT_HISTORY_LIMIT,
  type NoteChatAccepted,
  type NoteChatMessage,
  type NoteProposal,
  type NoteProposalAccepted,
  type NoteSection,
  type RequestNoteSectionEditDto,
  type ResearchNoteWithProposals,
  type SendNoteChatDto,
  type UpdateNoteSectionDto,
} from '@moderta/api-contracts/gaia'
import { AiTasks } from '@/ai/ai-tasks.service'
import { decodeCursor, toRecordPage } from '@/common/database/cursor-pagination'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { TRANSACTION_RUNNER, type TransactionRunner } from '@/common/database/transaction-runner'
import { ValidationFailedException } from '@/common/http/api-exception'
import { type ListResult, paginated } from '@/common/http/response-results'
import { NOTES_REPOSITORY, type NoteProposalRecord, type NoteRecord } from '@/research-app/notes/interfaces/notes-repository.interface'
import { NotesRepository } from '@/research-app/notes/repositories/notes.repository'
import { toNoteChatMessage, toNoteProposal, toResearchNote } from '@/research-app/notes/utils/note-mapper'
import { applyProposal, updateSectionContent } from '@/research-app/notes/utils/note-section'
import { ResearchAccess } from '@/research-app/research/services/research-access.service'

@Injectable()
export class NotesService {
  constructor(
    @Inject(NOTES_REPOSITORY) private readonly repository: NotesRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(ResearchAccess) private readonly research: ResearchAccess,
    @Inject(AiTasks) private readonly ai: AiTasks,
  ) { }

  async get(userId: string, researchId: string): Promise<ResearchNoteWithProposals> {
    await this.research.assertVisible(userId, researchId)

    const note = await this.findNoteOrThrow(researchId)
    const pendingProposals = await this.repository.findPendingProposals(note.id)
    const filledProposals = pendingProposals.filter((proposal) => proposal.content.content.trim() !== '')

    return toResearchNote(note, filledProposals)
  }

  updateSection(userId: string, researchId: string, sectionId: string, dto: UpdateNoteSectionDto): Promise<NoteSection> {
    return this.transactions.run(async (options) => {
      await this.research.assertVisible(userId, researchId, options)
      const note = await this.findNoteOrThrow(researchId, options)

      const change = updateSectionContent(note.content, sectionId, dto.content, userId, new Date())
      if (!change) throw new NotFoundException(NOTE_SECTION_NOT_FOUND_MESSAGE)

      await this.repository.saveNoteContent(note.id, change.note, options)
      return change.section
    })
  }

  async requestSectionEdit(
    userId: string,
    researchId: string,
    sectionId: string,
    dto: RequestNoteSectionEditDto,
  ): Promise<NoteProposalAccepted> {

    const research = await this.research.assertVisible(userId, researchId)
    const note = await this.findNoteOrThrow(researchId)

    const section = note.content.sections.find((item) => item.id === sectionId)
    if (!section) throw new NotFoundException(NOTE_SECTION_NOT_FOUND_MESSAGE)

    const previous = dto.proposalId ? await this.findProposalOrThrow(note.id, dto.proposalId) : null

    if (previous) {
      if (previous.content.sectionId !== sectionId) throw new NotFoundException(NOTE_PROPOSAL_NOT_FOUND_MESSAGE)
      if (previous.status !== NOTE_PROPOSAL_STATUS.PENDING) throw new ConflictException(NOTE_PROPOSAL_NOT_PENDING_MESSAGE)
    }

    let proposalId = previous?.id

    if (!proposalId) {
      proposalId = await this.repository.createProposal(note.id, { sectionId, content: '', citations: [], unsupported: [], note: '' })
    }

    const sources = await this.repository.findIncludedSources(researchId)

    try {
      const run = await this.ai.send({
        kind: AI_RUN_KIND.NOTE_SECTION_EDIT,
        taskId: proposalId,
        input: {
          instruction: dto.instruction,
          section,
          ...(previous ? { previousDraft: previous.content } : {}),
          research: { title: research.title, description: research.description, scopeNotes: research.scopeNotes },
          sources,
        },
      })
      await this.repository.setProposalRun(proposalId, run.id)
      return { proposalId }
    } catch (error) {
      if (!previous) await this.repository.resolveProposal(proposalId, NOTE_PROPOSAL_STATUS.DISCARDED, null)
      throw error
    }
  }

  async getProposal(userId: string, researchId: string, proposalId: string): Promise<NoteProposal> {
    await this.research.assertVisible(userId, researchId)
    const note = await this.findNoteOrThrow(researchId)

    return toNoteProposal(await this.findProposalOrThrow(note.id, proposalId))
  }

  acceptProposal(userId: string, researchId: string, proposalId: string, dto: AcceptNoteProposalDto): Promise<NoteProposal> {
    return this.transactions.run(async (options) => {
      await this.research.assertVisible(userId, researchId, options)
      const note = await this.findNoteOrThrow(researchId, options)
      const proposal = await this.findPendingProposalOrThrow(note.id, proposalId, options)

      const change = applyProposal(note.content, proposal.content, dto.mode, userId, new Date())
      if (!change) throw new NotFoundException(NOTE_SECTION_NOT_FOUND_MESSAGE)

      await this.repository.saveNoteContent(note.id, change.note, options)
      await this.repository.resolveProposal(proposal.id, NOTE_PROPOSAL_STATUS.ACCEPTED, userId, options)

      return toNoteProposal({ ...proposal, status: NOTE_PROPOSAL_STATUS.ACCEPTED, resolvedBy: userId })
    })
  }

  discardProposal(userId: string, researchId: string, proposalId: string): Promise<NoteProposal> {
    return this.transactions.run(async (options) => {
      await this.research.assertVisible(userId, researchId, options)
      const note = await this.findNoteOrThrow(researchId, options)
      const proposal = await this.findPendingProposalOrThrow(note.id, proposalId, options)

      await this.repository.resolveProposal(proposal.id, NOTE_PROPOSAL_STATUS.DISCARDED, userId, options)

      return toNoteProposal({ ...proposal, status: NOTE_PROPOSAL_STATUS.DISCARDED, resolvedBy: userId })
    })
  }

  async chat(userId: string, researchId: string, query: ListNoteChatQuery): Promise<ListResult<NoteChatMessage>> {
    const { cursor, limit } = query
    const after = cursor ? decodeCursor(cursor) : null
    if (cursor && !after) throw new ValidationFailedException({ cursor: [INVALID_CURSOR_MESSAGE] })

    await this.research.assertVisible(userId, researchId)
    const note = await this.findNoteOrThrow(researchId)

    const page = toRecordPage(await this.repository.findChatPage(note.id, { after, limit }), limit)
    return paginated<NoteChatMessage>({ items: page.records.map(toNoteChatMessage).reverse(), nextCursor: page.nextCursor }, limit)
  }

  async sendChat(userId: string, researchId: string, dto: SendNoteChatDto): Promise<NoteChatAccepted> {
    const research = await this.research.assertVisible(userId, researchId)
    const note = await this.findNoteOrThrow(researchId)

    const history = (await this.repository.findChatHistory(note.id, CHAT_HISTORY_LIMIT)).map(({ role, message }) => ({ role, message }))
    const messageId = await this.repository.addChatMessage({ noteId: note.id, role: CHAT_ROLE.PERSON, message: dto.message })

    try {
      await this.ai.send({
        kind: AI_RUN_KIND.NOTE_CHAT,
        taskId: messageId,
        input: {
          message: dto.message,
          history,
          research: { title: research.title, description: research.description, scopeNotes: research.scopeNotes },
          note: note.content,
        },
      })
      return { messageId }
    } catch (error) {
      await this.repository.deleteChatMessage(messageId)
      throw error
    }
  }

  private async findNoteOrThrow(researchId: string, options: RepositoryOptions = {}): Promise<NoteRecord> {
    const note = await this.repository.findLatestNote(researchId, options)
    if (!note) throw new NotFoundException(NOTE_NOT_FOUND_MESSAGE)

    return note
  }

  private async findProposalOrThrow(noteId: string, proposalId: string, options: RepositoryOptions = {}): Promise<NoteProposalRecord> {
    const proposal = await this.repository.findProposal(noteId, proposalId, options)
    if (!proposal) throw new NotFoundException(NOTE_PROPOSAL_NOT_FOUND_MESSAGE)

    return proposal
  }

  private async findPendingProposalOrThrow(noteId: string, proposalId: string, options: RepositoryOptions): Promise<NoteProposalRecord> {
    const proposal = await this.findProposalOrThrow(noteId, proposalId, options)
    if (proposal.status !== NOTE_PROPOSAL_STATUS.PENDING) throw new ConflictException(NOTE_PROPOSAL_NOT_PENDING_MESSAGE)

    return proposal
  }
}
