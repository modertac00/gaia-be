import type { AiRun } from '@moderta/api-contracts/gaia'
import type { AiRunRecord } from '@/ai/runs/ai-runs-repository.interface'

export function toAiRun(record: AiRunRecord): AiRun {
  return {
    id: record.id,
    researchId: record.researchId,
    tool: record.tool,
    kind: record.kind,
    status: record.status,
    error: record.error,
    output: record.output ?? null,
    startedAt: record.createdAt.toISOString(),
    finishedAt: record.finishedAt ? record.finishedAt.toISOString() : null,
  }
}
