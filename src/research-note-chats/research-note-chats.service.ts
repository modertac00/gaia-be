import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Pool } from 'pg'
import { DATABASE_POOL } from '../database/database.tokens'
import type { PublicUser } from '../users/user.types'
import type {
  CreateChatDto,
  ListChatQueryDto,
  RunChatDto,
} from './dto/research-note-chats.dto'

type ChatRow = {
  created_at: Date
  created_by: string
  id: string
  message: string
  message_type: string
  metadata: Record<string, unknown>
  research_note_id: string
  role: string
}

@Injectable()
export class ResearchNoteChatsService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listChats(researchId: string, noteId: string, query: ListChatQueryDto) {
    await this.assertNoteBelongsToResearch(researchId, noteId)

    const limit = query.limit ?? 50
    const params: unknown[] = [noteId]
    const where = ['research_note_id = $1']

    if (query.messageType) {
      params.push(query.messageType)
      where.push(`message_type = $${params.length}`)
    }

    if (query.cursor) {
      params.push(new Date(query.cursor))
      where.push(`created_at > $${params.length}`)
    }

    params.push(limit + 1)

    const result = await this.pool.query<ChatRow>(
      `
        select id, research_note_id, role, message, message_type, metadata,
          created_by, created_at
        from research_notes_chats
        where ${where.join(' and ')}
        order by created_at asc
        limit $${params.length}
      `,
      params,
    )

    const rows = result.rows.slice(0, limit)
    const nextRow = result.rows.at(limit)

    return {
      items: rows.map((row) => this.mapChat(row)),
      nextCursor: nextRow ? nextRow.created_at.toISOString() : null,
    }
  }

  async createChat(user: PublicUser, researchId: string, noteId: string, dto: CreateChatDto) {
    await this.assertNoteBelongsToResearch(researchId, noteId)

    const row = await this.insertChat(
      noteId,
      dto.role,
      dto.message,
      dto.messageType ?? 'chat',
      dto.metadata ?? {},
      user.name,
    )

    return this.mapChat(row)
  }

  async runChat(user: PublicUser, researchId: string, noteId: string, dto: RunChatDto) {
    await this.assertNoteBelongsToResearch(researchId, noteId)

    const userChat = await this.insertChat(
      noteId,
      'user',
      dto.message,
      dto.taskType,
      { ...(dto.metadata ?? {}), taskType: dto.taskType },
      user.name,
    )
    const assistantChat = await this.insertChat(
      noteId,
      'assistant',
      `Queued ${dto.taskType} for this research note.`,
      dto.taskType,
      { taskType: dto.taskType, status: 'queued' },
      'Gaia',
    )

    return {
      assistantChatId: assistantChat.id,
      status: 'queued',
      userChatId: userChat.id,
    }
  }

  private async assertNoteBelongsToResearch(researchId: string, noteId: string) {
    const result = await this.pool.query<{ id: string }>(
      `
        select id
        from research_notes
        where request_id = $1 and id = $2
      `,
      [researchId, noteId],
    )

    if (!result.rows[0]) {
      throw new NotFoundException('Research note was not found')
    }
  }

  private async insertChat(
    noteId: string,
    role: string,
    message: string,
    messageType: string,
    metadata: Record<string, unknown>,
    createdBy: string,
  ) {
    const result = await this.pool.query<ChatRow>(
      `
        insert into research_notes_chats (
          research_note_id, role, message, message_type, metadata, created_by
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id, research_note_id, role, message, message_type, metadata,
          created_by, created_at
      `,
      [noteId, role, message, messageType, metadata, createdBy],
    )

    return result.rows[0]
  }

  private mapChat(row: ChatRow) {
    return {
      createdAt: row.created_at.toISOString(),
      createdBy: row.created_by,
      id: row.id,
      message: row.message,
      messageType: row.message_type,
      metadata: row.metadata,
      researchNoteId: row.research_note_id,
      role: row.role,
    }
  }
}
