import {
  NOTE_PROPOSAL_ACCEPT_MODE,
  NOTE_SECTION_ORIGIN,
  NOTE_SECTION_STATUS,
  type NoteCitation,
  type NoteContent,
  type NoteProposalAcceptMode,
  type NoteProposalContent,
  type NoteSection,
  type NoteSectionReadyResult,
  type NoteSectionStatus,
} from '@moderta/api-contracts/gaia'

export interface SectionChange {
  note: NoteContent
  section: NoteSection
}

export const sectionStatusFor = (content: string): NoteSectionStatus =>
  content.trim() ? NOTE_SECTION_STATUS.READY : NOTE_SECTION_STATUS.EMPTY

/** Existing citations win; proposal citations are added when their marker is not used yet. */
export function mergeCitations(existing: NoteCitation[], incoming: NoteCitation[]): NoteCitation[] {
  const markers = new Set(existing.map((citation) => citation.marker))
  return [...existing, ...incoming.filter((citation) => !markers.has(citation.marker))]
}

/** Replace the section with the changes, bump section and note revisions, and stamp who/when. Returns null when the section is missing. */
function changeSection(
  note: NoteContent,
  sectionId: string,
  userId: string | null,
  now: Date,
  change: (section: NoteSection) => Partial<NoteSection>,
): SectionChange | null {
  const current = note.sections.find((section) => section.id === sectionId)
  if (!current) return null

  const section: NoteSection = {
    ...current,
    ...change(current),
    revision: current.revision + 1,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  }

  return {
    note: { ...note, revision: note.revision + 1, sections: note.sections.map((item) => (item.id === sectionId ? section : item)) },
    section,
  }
}

/** The AI wrote the first draft of the section while the research was being created. No person is the author. */
export function applyAiDraft(note: NoteContent, draft: NoteSectionReadyResult, now: Date): SectionChange | null {
  return changeSection(note, draft.sectionId, null, now, () => ({
    content: draft.content,
    status: sectionStatusFor(draft.content),
    origin: NOTE_SECTION_ORIGIN.AI_DRAFT,
    citations: draft.citations,
    unsupported: draft.unsupported,
  }))
}

/** A person typed new content for the section. */
export function updateSectionContent(note: NoteContent, sectionId: string, content: string, userId: string, now: Date): SectionChange | null {
  return changeSection(note, sectionId, userId, now, () => ({
    content,
    status: sectionStatusFor(content),
    origin: NOTE_SECTION_ORIGIN.PERSON,
  }))
}

/** A person accepted an AI proposal: replace the section, or append to it after a blank line. */
export function applyProposal(
  note: NoteContent,
  proposal: NoteProposalContent,
  mode: NoteProposalAcceptMode,
  userId: string,
  now: Date,
): SectionChange | null {
  return changeSection(note, proposal.sectionId, userId, now, (section) => {
    const append = mode === NOTE_PROPOSAL_ACCEPT_MODE.APPEND
    const existing = section.content.trimEnd()
    const content = append && existing ? `${existing}\n\n${proposal.content}` : proposal.content

    return {
      content,
      status: sectionStatusFor(content),
      origin: NOTE_SECTION_ORIGIN.AI_EDIT,
      citations: append ? mergeCitations(section.citations, proposal.citations) : proposal.citations,
      unsupported: append ? [...section.unsupported, ...proposal.unsupported] : proposal.unsupported,
    }
  })
}
