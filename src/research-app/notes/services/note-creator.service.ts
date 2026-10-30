import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  NOTE_FORMAT,
  NOTE_SCHEMA_VERSION,
  NOTE_SECTION_ORIGIN,
  NOTE_SECTION_STATUS,
  type NoteContent,
  type NoteSection,
} from '@moderta/api-contracts/gaia'
import type { RepositoryOptions } from '@/common/database/repository-options'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { DEFAULT_NOTE_SECTIONS } from '@/research-app/notes/utils/default-sections'

export interface CreatedNote {
  id: string
  sections: NoteSection[]
}

const FIRST_VERSION = 1
const FIRST_REVISION = 1


@Injectable()
export class NoteCreator {
  constructor(@InjectModel(ResearchNoteModel) private readonly noteModel: typeof ResearchNoteModel) { }

  async createInitialNote(researchId: string, userId: string, options: RepositoryOptions = {}): Promise<CreatedNote> {
    const now = new Date().toISOString()

    const sections: NoteSection[] = DEFAULT_NOTE_SECTIONS.map((section) => ({
      id: randomUUID(),
      type: section.type,
      heading: section.heading,
      content: '',
      citations: [],
      unsupported: [],
      status: NOTE_SECTION_STATUS.EMPTY,
      origin: NOTE_SECTION_ORIGIN.AI_DRAFT,
      revision: FIRST_REVISION,
      updatedAt: now,
      updatedBy: null,
    }))

    const content: NoteContent = {
      schemaVersion: NOTE_SCHEMA_VERSION,
      format: NOTE_FORMAT.MARKDOWN,
      revision: FIRST_REVISION,
      sections,
    }

    const row = await this.noteModel.create(
      { researchId, version: FIRST_VERSION, content, createdBy: userId },
      { transaction: options.transaction },
    )

    return { id: row.id, sections }
  }
}
