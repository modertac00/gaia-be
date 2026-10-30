import type { ConsensusSynthesis, ConsensusVerdict, EvidenceRow, EvidenceStatus } from '@moderta/api-contracts/gaia'

export const EVIDENCE_REPOSITORY = Symbol('EVIDENCE_REPOSITORY')

export type EvidenceRowRecord = Omit<EvidenceRow, 'reviewedAt' | 'createdAt'> & {
  reviewedAt: Date | null
  createdAt: Date
}

export type ConsensusRecord = Omit<ConsensusSynthesis, 'generatedAt'> & { generatedAt: Date }

export interface NewEvidenceRow {
  id: string
  researchId: string
  sourceId: string
  runId: string
  study: string
  locator: string | null
  method: string | null
  sample: string | null
  reportedEffect: string | null
  status: EvidenceStatus
  failureReason: string | null
}

export interface EvidenceSourceInfo {
  id: string
  title: string
  authors: string[]
}

export interface NewConsensus {
  researchId: string
  runId: string
  verdict: ConsensusVerdict
  supporting: number
  mixed: number
  contradicting: number
}
