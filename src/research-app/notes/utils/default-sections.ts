import { NOTE_SECTION_TYPE, type NoteSectionType } from '@moderta/api-contracts/gaia'

interface DefaultSection {
  type: NoteSectionType
  heading: string
}

// Edit this list to change the template.
export const DEFAULT_NOTE_SECTIONS: DefaultSection[] = [
  { type: NOTE_SECTION_TYPE.RESEARCH_QUESTION, heading: 'Research question & objectives' },
  { type: NOTE_SECTION_TYPE.FINDINGS, heading: 'Findings' },
  { type: NOTE_SECTION_TYPE.DISCUSSION, heading: 'Discussion' },
]
