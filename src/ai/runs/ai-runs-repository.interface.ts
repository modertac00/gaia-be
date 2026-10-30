import type { ActivityTool, AiError, AiRunKind, AiRunStatus } from '@moderta/api-contracts/gaia'

export const AI_RUNS_REPOSITORY = Symbol('AI_RUNS_REPOSITORY')

export interface AiRunRecord {
  id: string
  researchId: string
  tool: ActivityTool
  kind: AiRunKind
  status: AiRunStatus
  error: AiError | null
  output: unknown
  createdAt: Date
  finishedAt: Date | null
}

export interface NewQueuedAiRun {
  id: string
  researchId: string
  tool: ActivityTool
  kind: AiRunKind
}

export interface FinishedAiRun {
  id: string
  kind: AiRunKind
  tool: ActivityTool
  researchId?: string
  status: AiRunStatus
  error: AiError | null
  output: unknown
}

export interface AiRunFilters {
  kind?: AiRunKind
  status?: AiRunStatus
}
