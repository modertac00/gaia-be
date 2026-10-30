import { Inject, Injectable } from '@nestjs/common'
import {
  ACTIVITY_TOOL,
  AI_RUN_STATUS,
  type AiError,
  type AiRunKind,
  type AiRunStatus,
  type AiTaskPayload,
} from '@moderta/api-contracts/gaia'
import { AppLogger } from '@/log'
import { AI_RUNS_REPOSITORY } from '@/ai/runs/ai-runs-repository.interface'
import { AiRunsRepository } from '@/ai/runs/ai-runs.repository'

const CONTEXT = 'AiRuns'

interface FinishedRun {
  taskId: string
  kind: AiRunKind
  researchId: string | undefined
  status: AiRunStatus
  error: AiError | null
  output: unknown
}

@Injectable()
export class AiRuns {
  constructor(
    @Inject(AI_RUNS_REPOSITORY) private readonly repository: AiRunsRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) { }

  async recordQueued(researchId: string, task: AiTaskPayload): Promise<void> {
    try {
      await this.repository.createQueued({
        id: task.taskId,
        researchId,
        tool: ACTIVITY_TOOL.LITERATURE_REVIEW,
        kind: task.kind,
      })
    } catch (error) {
      this.logFailure(task.taskId, error)
    }
  }

  recordSucceeded(taskId: string, kind: AiRunKind, researchId: string | undefined, output: unknown): Promise<void> {
    return this.recordFinished({ taskId, kind, researchId, status: AI_RUN_STATUS.SUCCEEDED, error: null, output })
  }

  recordFailed(taskId: string, kind: AiRunKind, researchId: string | undefined, error: AiError): Promise<void> {
    return this.recordFinished({ taskId, kind, researchId, status: AI_RUN_STATUS.FAILED, error, output: null })
  }

  private async recordFinished(run: FinishedRun): Promise<void> {
    try {
      const saved = await this.repository.saveFinished({
        id: run.taskId,
        kind: run.kind,
        tool: ACTIVITY_TOOL.LITERATURE_REVIEW,
        researchId: run.researchId,
        status: run.status,
        error: run.error,
        output: run.output,
      })

      if (!saved) this.logger.warn(`AI run ${run.taskId} (${run.kind}) was not logged: its research is unknown`, CONTEXT)
    } catch (error) {
      this.logFailure(run.taskId, error)
    }
  }

  private logFailure(taskId: string, error: unknown): void {
    this.logger.error(`Could not log AI run ${taskId}: ${String(error)}`, error instanceof Error ? error.stack : undefined, CONTEXT)
  }
}
