import { EVIDENCE_EXTRACTION_FAILED_MESSAGE } from '@moderta/api-contracts/gaia'
import type { EvidenceSourceInfo } from '@/research-app/evidence/interfaces/evidence-repository.interface'

const NO_TEXT_MESSAGE = 'No text available for this source'

export interface FailedRowDetails {
  rowId: string
  paperId: string
  reason: string | null
}

/** Reads { rowId, paperId, reason } from the details of an evidence_row_failed error. Null when rowId or paperId is missing. */
export function readFailedRowDetails(details: Record<string, unknown> | undefined): FailedRowDetails | null {
  if (!details) return null
  if (typeof details.rowId !== 'string' || typeof details.paperId !== 'string') return null

  const reason = typeof details.reason === 'string' ? details.reason : null
  return { rowId: details.rowId, paperId: details.paperId, reason }
}

export function failureMessageFor(reason: string | null, errorMessage: string): string {
  if (reason === 'no_text') return NO_TEXT_MESSAGE
  if (reason === 'model_error') return EVIDENCE_EXTRACTION_FAILED_MESSAGE
  return errorMessage
}

/** A short name for a failed row: "First et al." for several authors, the author for one, else the title. */
export function studyLabelFor(source: EvidenceSourceInfo): string {
  if (source.authors.length > 1) return `${source.authors[0]} et al.`
  if (source.authors.length === 1) return source.authors[0]
  return source.title
}
