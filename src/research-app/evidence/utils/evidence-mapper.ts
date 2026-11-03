import type { ConsensusSynthesis, EvidenceMatrix, EvidenceRow } from '@moderta/api-contracts/gaia'
import type { ConsensusRecord, EvidenceRowRecord } from '@/research-app/evidence/interfaces/evidence-repository.interface'

export function toEvidenceRow(record: EvidenceRowRecord): EvidenceRow {
  return {
    ...record,
    reviewedAt: record.reviewedAt ? record.reviewedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  }
}

export function toConsensus(record: ConsensusRecord): ConsensusSynthesis {
  return { ...record, generatedAt: record.generatedAt.toISOString() }
}

export function toEvidenceMatrix(rows: EvidenceRowRecord[], consensus: ConsensusRecord | null): EvidenceMatrix {
  return {
    rows: rows.map(toEvidenceRow),
    consensus: consensus ? toConsensus(consensus) : null,
  }
}
