import { Inject, Injectable } from '@nestjs/common'
import {
  ACTIVITY_TOOL,
  AI_RUN_STATUS,
  REALTIME_RESOURCE,
  type AiError,
  type AiRunKind,
  type AiRunStatus,
  type AiTaskPayload,
} from '@moderta/api-contracts/gaia'
import { AppLogger } from '@/log'
import { AI_RUNS_REPOSITORY } from '@/ai/runs/ai-runs-repository.interface'
import { AiRunsRepository } from '@/ai/runs/ai-runs.repository'
import { RUN_RESOURCES } from '@/ai/runs/run-resources'
import { ResearchEvents } from '@/realtime/research-events.service'

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
    @Inject(ResearchEvents) private readonly events: ResearchEvents,
  ) { }

  async recordQueued(researchId: string, task: AiTaskPayload): Promise<void> {
    try {
      await this.repository.createQueued({
        id: task.taskId,
        researchId,
        tool: ACTIVITY_TOOL.LITERATURE_REVIEW,
        kind: task.kind,
      })
      this.notify({ taskId: task.taskId, kind: task.kind, researchId, status: AI_RUN_STATUS.QUEUED, error: null })
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

      if (!saved) {
        this.logger.warn(`AI run ${run.taskId} (${run.kind}) was not logged: its research is unknown`, CONTEXT)
        return
      }

      this.notify(run)
    } catch (error) {
      this.logFailure(run.taskId, error)
    }
  }

  // Tells the browsers following this research. A failure here must never break the run log.
  private notify(run: Pick<FinishedRun, 'taskId' | 'kind' | 'researchId' | 'status' | 'error'>): void {
    const { researchId } = run
    if (!researchId) return

    try {
      this.events.aiStatus({ researchId, runId: run.taskId, kind: run.kind, status: run.status, error: run.error })

      const resource = RUN_RESOURCES[run.kind]
      if (run.status === AI_RUN_STATUS.SUCCEEDED && resource) {
        this.events.dataChanged({ researchId, resource })
      }
      this.events.dataChanged({ researchId, resource: REALTIME_RESOURCE.RUNS })
    } catch (error) {
      this.logger.warn(`Could not send realtime update for AI run ${run.taskId}: ${String(error)}`, CONTEXT)
    }
  }

  private logFailure(taskId: string, error: unknown): void {
    this.logger.error(`Could not log AI run ${taskId}: ${String(error)}`, error instanceof Error ? error.stack : undefined, CONTEXT)
  }
}
