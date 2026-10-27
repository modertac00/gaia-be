import type { Research } from '@moderta/api-contracts/gaia'
import type { ResearchRecord } from '@/research/interfaces/research-repository.interface'

export function toResearch(record: ResearchRecord): Research {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
