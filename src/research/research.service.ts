import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Pool, PoolClient } from 'pg'
import { DATABASE_POOL } from '../database/database.tokens'
import type { PublicUser } from '../users/user.types'
import type {
  CreateNoteSectionDto,
  CreatePaperDto,
  CreateResearchDto,
  CreateResearchNoteDto,
  ListResearchQueryDto,
  UpdateNoteSectionDto,
  UpdatePaperDto,
  UpdateResearchDto,
  UpdateResearchNoteDto,
} from './dto/research.dto'

type ResearchRow = {
  ai_instructions: string
  created_at: Date
  id: string
  research_type: string
  scope_notes: string
  status: string
  title: string
  topic: string
  updated_at: Date
}

type ResearchDetailRow = ResearchRow & {
  chat_count: string
  latest_note_id: string | null
  latest_note_status: string | null
  latest_note_title: string | null
  latest_note_version: number | null
  paper_count: string
}

type ResearchNoteRow = {
  created_at: Date
  created_by: string
  format_schema: Record<string, unknown>
  id: string
  request_id: string
  status: string
  title: string
  version: number
}

type ResearchNoteSectionRow = {
  content: string
  content_format: string
  format_metadata: Record<string, unknown>
  id: string
  position: number
  title: string
}

type PaperRow = {
  created_at: Date
  created_by: string
  description: string
  id: string
  is_verified: boolean
  paper_url: string | null
  research_id: string
  title: string
}

@Injectable()
export class ResearchService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async listResearch(query: ListResearchQueryDto) {
    const limit = query.limit ?? 25
    const params: unknown[] = []
    const where: string[] = []

    if (query.status) {
      params.push(query.status)
      where.push(`status = $${params.length}`)
    }

    if (query.researchType) {
      params.push(query.researchType)
      where.push(`research_type = $${params.length}`)
    }

    if (query.search) {
      params.push(`%${query.search}%`)
      where.push(
        `(title ilike $${params.length} or topic ilike $${params.length} or scope_notes ilike $${params.length})`,
      )
    }

    if (query.cursor) {
      params.push(new Date(query.cursor))
      where.push(`created_at < $${params.length}`)
    }

    params.push(limit + 1)

    const result = await this.pool.query<ResearchRow>(
      `
        select id, title, topic, research_type, status, scope_notes,
          ai_instructions, created_at, updated_at
        from research
        ${where.length ? `where ${where.join(' and ')}` : ''}
        order by created_at desc
        limit $${params.length}
      `,
      params,
    )

    const rows = result.rows.slice(0, limit)
    const nextRow = result.rows.at(limit)

    return {
      items: rows.map((row) => this.mapResearch(row)),
      nextCursor: nextRow ? nextRow.created_at.toISOString() : null,
    }
  }

  async createResearch(user: PublicUser, dto: CreateResearchDto) {
    const result = await this.pool.query<{ id: string; status: string }>(
      `
        insert into research (
          title, topic, research_type, status, requested_by_user_id,
          scope_notes, ai_instructions
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id, status
      `,
      [
        dto.title.trim(),
        dto.topic.trim(),
        dto.researchType,
        dto.status ?? 'queued',
        user.id,
        dto.scopeNotes?.trim() ?? '',
        dto.aiInstructions?.trim() ?? '',
      ],
    )

    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
    }
  }

  async getResearch(researchId: string) {
    const result = await this.pool.query<ResearchDetailRow>(
      `
        select r.id, r.title, r.topic, r.research_type, r.status,
          r.scope_notes, r.ai_instructions, r.created_at, r.updated_at,
          latest_note.id as latest_note_id,
          latest_note.title as latest_note_title,
          latest_note.version as latest_note_version,
          latest_note.status as latest_note_status,
          count(distinct p.id)::text as paper_count,
          count(distinct c.id)::text as chat_count
        from research r
        left join lateral (
          select id, title, version, status
          from research_notes
          where request_id = r.id
          order by version desc
          limit 1
        ) latest_note on true
        left join knowledge_base_papers p on p.research_id = r.id
        left join research_notes n on n.request_id = r.id
        left join research_notes_chats c on c.research_note_id = n.id
        where r.id = $1
        group by r.id, latest_note.id, latest_note.title,
          latest_note.version, latest_note.status
      `,
      [researchId],
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Research was not found')
    }

    return {
      ...this.mapResearch(row),
      latestNote: row.latest_note_id
        ? {
            id: row.latest_note_id,
            status: row.latest_note_status,
            title: row.latest_note_title,
            version: row.latest_note_version,
          }
        : null,
      paperCount: Number(row.paper_count),
      chatCount: Number(row.chat_count),
    }
  }

  async updateResearch(researchId: string, dto: UpdateResearchDto) {
    const updates: string[] = []
    const params: unknown[] = []

    this.addUpdate(updates, params, 'title', dto.title?.trim())
    this.addUpdate(updates, params, 'topic', dto.topic?.trim())
    this.addUpdate(updates, params, 'research_type', dto.researchType)
    this.addUpdate(updates, params, 'status', dto.status)
    this.addUpdate(updates, params, 'scope_notes', dto.scopeNotes?.trim())
    this.addUpdate(updates, params, 'ai_instructions', dto.aiInstructions?.trim())

    if (!updates.length) {
      return this.getResearch(researchId)
    }

    params.push(researchId)

    const result = await this.pool.query<ResearchRow>(
      `
        update research
        set ${updates.join(', ')}
        where id = $${params.length}
        returning id, title, topic, research_type, status, scope_notes,
          ai_instructions, created_at, updated_at
      `,
      params,
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Research was not found')
    }

    return this.mapResearch(row)
  }

  async listNotes(researchId: string) {
    await this.assertResearchExists(researchId)

    const result = await this.pool.query<ResearchNoteRow>(
      `
        select id, request_id, title, version, status, format_schema,
          created_by, created_at
        from research_notes
        where request_id = $1
        order by version desc
      `,
      [researchId],
    )

    return {
      items: result.rows.map((row) => this.mapNote(row)),
    }
  }

  async createNote(user: PublicUser, researchId: string, dto: CreateResearchNoteDto) {
    const client = await this.pool.connect()

    try {
      await client.query('begin')
      await this.assertResearchExists(researchId, client)

      const versionResult = await client.query<{ next_version: number }>(
        `
          select coalesce(max(version), 0) + 1 as next_version
          from research_notes
          where request_id = $1
        `,
        [researchId],
      )
      const version = versionResult.rows[0].next_version
      const noteResult = await client.query<ResearchNoteRow>(
        `
          insert into research_notes (
            request_id, title, version, status, format_schema, created_by
          )
          values ($1, $2, $3, $4, $5, $6)
          returning id, request_id, title, version, status, format_schema,
            created_by, created_at
        `,
        [
          researchId,
          dto.title.trim(),
          version,
          dto.status ?? 'draft',
          dto.formatSchema ?? {},
          user.name,
        ],
      )
      const note = noteResult.rows[0]

      for (const [index, section] of (dto.sections ?? []).entries()) {
        await this.insertSection(client, note.id, section, section.position ?? index + 1)
      }

      await client.query('commit')

      return {
        id: note.id,
        status: note.status,
        version: note.version,
      }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async getNote(researchId: string, noteId: string) {
    const note = await this.getNoteRow(researchId, noteId)
    const sectionsResult = await this.pool.query<ResearchNoteSectionRow>(
      `
        select id, position, title, content, content_format, format_metadata
        from research_note_sections
        where note_id = $1
        order by position asc, created_at asc
      `,
      [noteId],
    )

    return {
      ...this.mapNote(note),
      sections: sectionsResult.rows.map((row) => this.mapSection(row)),
    }
  }

  async updateNote(researchId: string, noteId: string, dto: UpdateResearchNoteDto) {
    await this.getNoteRow(researchId, noteId)

    const updates: string[] = []
    const params: unknown[] = []

    this.addUpdate(updates, params, 'title', dto.title?.trim())
    this.addUpdate(updates, params, 'status', dto.status)
    this.addUpdate(updates, params, 'format_schema', dto.formatSchema)

    if (!updates.length) {
      return this.getNote(researchId, noteId)
    }

    params.push(noteId)

    await this.pool.query(
      `
        update research_notes
        set ${updates.join(', ')}
        where id = $${params.length}
      `,
      params,
    )

    return this.getNote(researchId, noteId)
  }

  async createSection(researchId: string, noteId: string, dto: CreateNoteSectionDto) {
    await this.getNoteRow(researchId, noteId)

    const position = dto.position ?? (await this.getNextSectionPosition(noteId))
    const result = await this.insertSection(this.pool, noteId, dto, position)

    return this.mapSection(result)
  }

  async updateSection(
    researchId: string,
    noteId: string,
    sectionId: string,
    dto: UpdateNoteSectionDto,
  ) {
    await this.getNoteRow(researchId, noteId)

    const updates: string[] = []
    const params: unknown[] = []

    this.addUpdate(updates, params, 'title', dto.title?.trim())
    this.addUpdate(updates, params, 'content', dto.content)
    this.addUpdate(updates, params, 'content_format', dto.contentFormat)
    this.addUpdate(updates, params, 'format_metadata', dto.formatMetadata)
    this.addUpdate(updates, params, 'position', dto.position)

    if (!updates.length) {
      const row = await this.getSectionRow(noteId, sectionId)
      return this.mapSection(row)
    }

    params.push(noteId, sectionId)

    const result = await this.pool.query<ResearchNoteSectionRow>(
      `
        update research_note_sections
        set ${updates.join(', ')}
        where note_id = $${params.length - 1} and id = $${params.length}
        returning id, position, title, content, content_format, format_metadata
      `,
      params,
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Research note section was not found')
    }

    return this.mapSection(row)
  }

  async deleteSection(researchId: string, noteId: string, sectionId: string) {
    await this.getNoteRow(researchId, noteId)

    const result = await this.pool.query<{ id: string }>(
      `
        delete from research_note_sections
        where note_id = $1 and id = $2
        returning id
      `,
      [noteId, sectionId],
    )

    if (!result.rows[0]) {
      throw new NotFoundException('Research note section was not found')
    }

    return { id: sectionId }
  }

  async listPapers(researchId: string) {
    await this.assertResearchExists(researchId)

    const result = await this.pool.query<PaperRow>(
      `
        select id, research_id, title, description, is_verified, paper_url,
          created_by, created_at
        from knowledge_base_papers
        where research_id = $1
        order by created_at desc
      `,
      [researchId],
    )

    return {
      items: result.rows.map((row) => this.mapPaper(row)),
    }
  }

  async createPaper(user: PublicUser, researchId: string, dto: CreatePaperDto) {
    await this.assertResearchExists(researchId)

    const result = await this.pool.query<PaperRow>(
      `
        insert into knowledge_base_papers (
          research_id, title, description, is_verified, paper_url, created_by
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id, research_id, title, description, is_verified, paper_url,
          created_by, created_at
      `,
      [
        researchId,
        dto.title.trim(),
        dto.description.trim(),
        dto.isVerified ?? false,
        dto.paperUrl ?? null,
        user.name,
      ],
    )

    return this.mapPaper(result.rows[0])
  }

  async updatePaper(researchId: string, paperId: string, dto: UpdatePaperDto) {
    await this.assertResearchExists(researchId)

    const updates: string[] = []
    const params: unknown[] = []

    this.addUpdate(updates, params, 'title', dto.title?.trim())
    this.addUpdate(updates, params, 'description', dto.description?.trim())
    this.addUpdate(updates, params, 'is_verified', dto.isVerified)
    this.addUpdate(updates, params, 'paper_url', dto.paperUrl)

    if (!updates.length) {
      const row = await this.getPaperRow(researchId, paperId)
      return this.mapPaper(row)
    }

    params.push(researchId, paperId)

    const result = await this.pool.query<PaperRow>(
      `
        update knowledge_base_papers
        set ${updates.join(', ')}
        where research_id = $${params.length - 1} and id = $${params.length}
        returning id, research_id, title, description, is_verified, paper_url,
          created_by, created_at
      `,
      params,
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Knowledge base paper was not found')
    }

    return this.mapPaper(row)
  }

  private addUpdate(
    updates: string[],
    params: unknown[],
    column: string,
    value: unknown,
  ) {
    if (value === undefined) {
      return
    }

    params.push(value)
    updates.push(`${column} = $${params.length}`)
  }

  private async assertResearchExists(researchId: string, client: Pool | PoolClient = this.pool) {
    const result = await client.query<{ id: string }>(
      'select id from research where id = $1',
      [researchId],
    )

    if (!result.rows[0]) {
      throw new NotFoundException('Research was not found')
    }
  }

  private async getNoteRow(researchId: string, noteId: string) {
    const result = await this.pool.query<ResearchNoteRow>(
      `
        select id, request_id, title, version, status, format_schema,
          created_by, created_at
        from research_notes
        where request_id = $1 and id = $2
      `,
      [researchId, noteId],
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Research note was not found')
    }

    return row
  }

  private async getSectionRow(noteId: string, sectionId: string) {
    const result = await this.pool.query<ResearchNoteSectionRow>(
      `
        select id, position, title, content, content_format, format_metadata
        from research_note_sections
        where note_id = $1 and id = $2
      `,
      [noteId, sectionId],
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Research note section was not found')
    }

    return row
  }

  private async getPaperRow(researchId: string, paperId: string) {
    const result = await this.pool.query<PaperRow>(
      `
        select id, research_id, title, description, is_verified, paper_url,
          created_by, created_at
        from knowledge_base_papers
        where research_id = $1 and id = $2
      `,
      [researchId, paperId],
    )

    const row = result.rows[0]

    if (!row) {
      throw new NotFoundException('Knowledge base paper was not found')
    }

    return row
  }

  private async getNextSectionPosition(noteId: string) {
    const result = await this.pool.query<{ next_position: number }>(
      `
        select coalesce(max(position), 0) + 1 as next_position
        from research_note_sections
        where note_id = $1
      `,
      [noteId],
    )

    return result.rows[0].next_position
  }

  private async insertSection(
    client: Pick<Pool | PoolClient, 'query'>,
    noteId: string,
    section: CreateNoteSectionDto,
    position: number,
  ) {
    if (!section.title.trim()) {
      throw new BadRequestException('Section title is required')
    }

    const result = await client.query<ResearchNoteSectionRow>(
      `
        insert into research_note_sections (
          note_id, position, title, content, content_format, format_metadata
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id, position, title, content, content_format, format_metadata
      `,
      [
        noteId,
        position,
        section.title.trim(),
        section.content,
        section.contentFormat ?? 'plain_text',
        section.formatMetadata ?? {},
      ],
    )

    return result.rows[0]
  }

  private mapResearch(row: ResearchRow) {
    return {
      aiInstructions: row.ai_instructions,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      researchType: row.research_type,
      scopeNotes: row.scope_notes,
      status: row.status,
      title: row.title,
      topic: row.topic,
      updatedAt: row.updated_at.toISOString(),
    }
  }

  private mapNote(row: ResearchNoteRow) {
    return {
      createdAt: row.created_at.toISOString(),
      createdBy: row.created_by,
      formatSchema: row.format_schema,
      id: row.id,
      researchId: row.request_id,
      status: row.status,
      title: row.title,
      version: row.version,
    }
  }

  private mapSection(row: ResearchNoteSectionRow) {
    return {
      content: row.content,
      contentFormat: row.content_format,
      formatMetadata: row.format_metadata,
      id: row.id,
      position: row.position,
      title: row.title,
    }
  }

  private mapPaper(row: PaperRow) {
    return {
      createdAt: row.created_at.toISOString(),
      createdBy: row.created_by,
      description: row.description,
      id: row.id,
      isVerified: row.is_verified,
      paperUrl: row.paper_url,
      researchId: row.research_id,
      title: row.title,
    }
  }

}
