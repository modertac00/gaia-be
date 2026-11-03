import type { NoteChatMessage, NoteProposal, ResearchNoteWithProposals } from '@moderta/api-contracts/gaia'
import type { NoteChatRecord, NoteProposalRecord, NoteRecord } from '@/research-app/notes/interfaces/notes-repository.interface'

export function toNoteProposal(record: NoteProposalRecord): NoteProposal {
  return { ...record, createdAt: record.createdAt.toISOString() }
}

export function toResearchNote(record: NoteRecord, proposals: NoteProposalRecord[]): ResearchNoteWithProposals {
  return { ...record, createdAt: record.createdAt.toISOString(), proposals: proposals.map(toNoteProposal) }
}

export function toNoteChatMessage(record: NoteChatRecord): NoteChatMessage {
  return { ...record, createdAt: record.createdAt.toISOString() }
}
