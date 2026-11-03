import { SOURCE_TIER, type PaperReliability, type SourceTier } from '@moderta/api-contracts/gaia'

/** The AI rates a paper by reliability; we store it as a source tier. */
export function tierFromReliability(reliability: PaperReliability): SourceTier {
  if (reliability === 'peer_reviewed') return SOURCE_TIER.PEER_REVIEWED
  if (reliability === 'report') return SOURCE_TIER.WORKING_PAPER
  if (reliability === 'press') return SOURCE_TIER.PRESS_SECONDARY
  return SOURCE_TIER.OTHER
}
