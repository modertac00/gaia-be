import { NOTE_SECTION_TYPE, type NoteSectionType } from '@moderta/api-contracts/gaia'

interface DefaultSection {
  type: NoteSectionType
  heading: string
}

export const DEFAULT_NOTE_SECTIONS: DefaultSection[] = [
  { type: NOTE_SECTION_TYPE.RESEARCH_QUESTION, heading: 'Research question & objectives' },
  { type: NOTE_SECTION_TYPE.LITERATURE_REVIEW, heading: 'Literature review' },
  { type: NOTE_SECTION_TYPE.METHODOLOGY, heading: 'Methodology' },
  { type: NOTE_SECTION_TYPE.FINDINGS, heading: 'Findings' },
  { type: NOTE_SECTION_TYPE.DISCUSSION, heading: 'Discussion' },
  { type: NOTE_SECTION_TYPE.LIMITATIONS, heading: 'Limitations' },
  { type: NOTE_SECTION_TYPE.CONCLUSION, heading: 'Conclusion' },
  { type: NOTE_SECTION_TYPE.REFERENCES, heading: 'References' },
]