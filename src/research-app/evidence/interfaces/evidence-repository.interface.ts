import type { ConsensusSynthesis, ConsensusVerdict, EvidenceRow, EvidenceStatus } from '@moderta/api-contracts/gaia'

export const EVIDENCE_REPOSITORY = Symbol('EVIDENCE_REPOSITORY')

export type EvidenceRowRecord = Omit<EvidenceRow, 'reviewedAt' | 'createdAt'> & {
  reviewedAt: Date | null
  createdAt: Date
}

export type ConsensusRecord = Omit<ConsensusSynthesis, 'generatedAt'> & { generatedAt: Date }

export interface NewEvidenceRow {
  researchId: string
  sourceId: string | null
  runId: string
  study: string
  locator: string | null
  method: string | null
  sample: string | null
  reportedEffect: string | null
  status: EvidenceStatus
  failureReason: string | null
}

export interface NewConsensus {
  researchId: string
  runId: string
  verdict: ConsensusVerdict
  supporting: number
  mixed: number
  contradicting: number
}
