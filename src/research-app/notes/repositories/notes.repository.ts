import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  CHAT_ROLE,
  NOTE_PROPOSAL_STATUS,
  type NoteContent,
  type NoteProposalContent,
  type NoteProposalStatus,
  type NoteSectionEditResult,
  type NoteTaskSource,
} from '@moderta/api-contracts/gaia'
import { Op, type WhereOptions } from 'sequelize'
import type { CursorPosition } from '@/common/database/cursor-pagination'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  NewNoteChatMessage,
  NoteChatRecord,
  NoteProposalRecord,
  NoteRecord,
} from '@/research-app/notes/interfaces/notes-repository.interface'
import { ResearchNoteAiProposalModel } from '@/research-app/notes/models/research-note-ai-proposal.model'
import { ResearchNoteChatModel } from '@/research-app/notes/models/research-note-chat.model'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Injectable()
export class NotesRepository {
  constructor(
    @InjectModel(ResearchNoteModel) private readonly noteModel: typeof ResearchNoteModel,
    @InjectModel(ResearchNoteAiProposalModel) private readonly proposalModel: typeof ResearchNoteAiProposalModel,
    @InjectModel(ResearchNoteChatModel) private readonly chatModel: typeof ResearchNoteChatModel,
    @InjectModel(SourceModel) private readonly sourceModel: typeof SourceModel,
  ) { }

  /** The note with the highest version; locked for update inside a transaction. */
  async findLatestNote(researchId: string, options: RepositoryOptions = {}): Promise<NoteRecord | null> {
    const row = await this.noteModel.findOne({
      where: { researchId },
      order: [['version', 'DESC']],
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return row ? this.toNoteRecord(row.get({ plain: true })) : null
  }

  async saveNoteContent(noteId: string, content: NoteContent, options: RepositoryOptions = {}): Promise<void> {
    await this.noteModel.update({ content }, { where: { id: noteId }, transaction: options.transaction })
  }

  async findPendingProposals(noteId: string): Promise<NoteProposalRecord[]> {
    const rows = await this.proposalModel.findAll({
      where: { noteId, status: NOTE_PROPOSAL_STATUS.PENDING },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => this.toProposalRecord(row.get({ plain: true })))
  }

  async findProposal(noteId: string, proposalId: string, options: RepositoryOptions = {}): Promise<NoteProposalRecord | null> {
    const row = await this.proposalModel.findOne({
      where: { id: proposalId, noteId },
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return row ? this.toProposalRecord(row.get({ plain: true })) : null
  }

  async createProposal(noteId: string, content: NoteProposalContent, options: RepositoryOptions = {}): Promise<string> {
    const row = await this.proposalModel.create(
      { noteId, contentJson: content, status: NOTE_PROPOSAL_STATUS.PENDING },
      { transaction: options.transaction },
    )
    return row.id
  }

  async setProposalRun(proposalId: string, runId: string): Promise<void> {
    await this.proposalModel.update({ runId }, { where: { id: proposalId } })
  }

  /** Only a pending proposal can be resolved; returns false when it was not pending. */
  async resolveProposal(
    proposalId: string,
    status: NoteProposalStatus,
    userId: string | null,
    options: RepositoryOptions = {},
  ): Promise<boolean> {
    const [count] = await this.proposalModel.update(
      { status, resolvedBy: userId },
      { where: { id: proposalId, status: NOTE_PROPOSAL_STATUS.PENDING }, transaction: options.transaction },
    )
    return count > 0
  }

  /** Writes the AI result into a still-pending proposal, keeping its target section. */
  async fillProposal(proposalId: string, result: NoteSectionEditResult): Promise<void> {
    const row = await this.proposalModel.findOne({ where: { id: proposalId, status: NOTE_PROPOSAL_STATUS.PENDING } })
    if (!row) return

    await row.update({ contentJson: { ...result, sectionId: row.contentJson.sectionId } })
  }

  async addChatMessage(message: NewNoteChatMessage, options: RepositoryOptions = {}): Promise<string> {
    const row = await this.chatModel.create(
      {
        noteId: message.noteId,
        role: message.role,
        message: message.message,
        llmRunId: message.llmRunId ?? null,
        metadata: message.metadata ?? null,
      },
      { transaction: options.transaction },
    )
    return row.id
  }

  async deleteChatMessage(messageId: string): Promise<void> {
    await this.chatModel.destroy({ where: { id: messageId } })
  }

  async findChatMessage(messageId: string): Promise<{ id: string; noteId: string } | null> {
    const row = await this.chatModel.findOne({ attributes: ['id', 'noteId'], where: { id: messageId, role: CHAT_ROLE.PERSON } })
    return row ? { id: row.id, noteId: row.noteId } : null
  }

  async hasChatReply(messageId: string): Promise<boolean> {
    const count = await this.chatModel.count({ where: { llmRunId: messageId, role: CHAT_ROLE.ASSISTANT } })
    return count > 0
  }

  async findChatHistory(noteId: string, limit: number): Promise<NoteChatRecord[]> {
    const rows = await this.chatModel.findAll({
      where: { noteId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit,
    })
    return rows.reverse().map((row) => this.toChatRecord(row.get({ plain: true })))
  }

  async findChatPage(noteId: string, page: { after: CursorPosition | null; limit: number }): Promise<NoteChatRecord[]> {
    const conditions: WhereOptions[] = [{ noteId }]

    if (page.after) {
      const { createdAt, id } = page.after
      conditions.push({ [Op.or]: [{ createdAt: { [Op.lt]: createdAt } }, { createdAt, id: { [Op.lt]: id } }] })
    }

    const rows = await this.chatModel.findAll({
      where: { [Op.and]: conditions },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: page.limit + 1,
    })
    return rows.map((row) => this.toChatRecord(row.get({ plain: true })))
  }

  async findIncludedSources(researchId: string): Promise<NoteTaskSource[]> {
    const rows = await this.sourceModel.findAll({
      attributes: ['id', 'title', 'authors', 'doi', 'publicationYear'],
      where: { researchId, includedInResearch: true },
      order: [['marker', 'ASC']],
    })
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      authors: row.authors,
      doi: row.doi,
      year: row.publicationYear,
    }))
  }

  private toNoteRecord(plain: ResearchNoteModel): NoteRecord {
    return {
      id: plain.id,
      researchId: plain.researchId,
      version: plain.version,
      content: plain.content,
      createdAt: plain.createdAt,
    }
  }

  private toProposalRecord(plain: ResearchNoteAiProposalModel): NoteProposalRecord {
    return {
      id: plain.id,
      noteId: plain.noteId,
      status: plain.status,
      content: plain.contentJson,
      resolvedBy: plain.resolvedBy,
      createdAt: plain.createdAt,
    }
  }

  private toChatRecord(plain: ResearchNoteChatModel): NoteChatRecord {
    return { id: plain.id, role: plain.role, message: plain.message, createdAt: plain.createdAt }
  }
}
