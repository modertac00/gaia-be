import type { ChatRole, NoteChatMessage, NoteProposal, ResearchNote } from '@moderta/api-contracts/gaia'

export const NOTES_REPOSITORY = Symbol('NOTES_REPOSITORY')

export type NoteRecord = Omit<ResearchNote, 'createdAt'> & { createdAt: Date }

export type NoteProposalRecord = Omit<NoteProposal, 'createdAt'> & { createdAt: Date }

export type NoteChatRecord = Omit<NoteChatMessage, 'createdAt'> & { createdAt: Date }

export interface NewNoteChatMessage {
  noteId: string
  role: ChatRole
  message: string
  llmRunId?: string | null
  metadata?: Record<string, unknown> | null
}
