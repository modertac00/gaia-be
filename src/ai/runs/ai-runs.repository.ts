import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { AI_RUN_STATUS } from '@moderta/api-contracts/gaia'
import { Op, type WhereOptions } from 'sequelize'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type { CursorPosition } from '@/common/database/cursor-pagination'
import { AiRunModel } from '@/ai/runs/ai-run.model'
import type { AiRunFilters, AiRunRecord, FinishedAiRun, NewQueuedAiRun } from '@/ai/runs/ai-runs-repository.interface'

@Injectable()
export class AiRunsRepository {
  constructor(@InjectModel(AiRunModel) private readonly model: typeof AiRunModel) { }

  async createQueued(run: NewQueuedAiRun, options: RepositoryOptions = {}): Promise<void> {
    await this.model.findOrCreate({
      where: { id: run.id },
      defaults: { ...run, status: AI_RUN_STATUS.QUEUED, error: null, output: null, startedAt: new Date(), finishedAt: null },
      transaction: options.transaction,
    })
  }


  async saveFinished(run: FinishedAiRun): Promise<boolean> {
    const finishedAt = new Date()
    const existing = await this.model.findByPk(run.id)

    if (existing) {
      await existing.update({ status: run.status, error: run.error, output: run.output, finishedAt })
      return true
    }

    if (!run.researchId) return false

    await this.model.create({
      id: run.id,
      researchId: run.researchId,
      tool: run.tool,
      kind: run.kind,
      status: run.status,
      error: run.error,
      output: run.output,
      startedAt: finishedAt,
      finishedAt,
    })
    return true
  }

  async findPage(researchId: string, filters: AiRunFilters, page: { after: CursorPosition | null; limit: number }): Promise<AiRunRecord[]> {
    const conditions: WhereOptions[] = [{ researchId }]

    if (filters.kind) conditions.push({ kind: filters.kind })
    if (filters.status) conditions.push({ status: filters.status })

    if (page.after) {
      const startedAt = page.after.createdAt
      const { id } = page.after
      conditions.push({ [Op.or]: [{ startedAt: { [Op.lt]: startedAt } }, { startedAt, id: { [Op.lt]: id } }] })
    }

    const rows = await this.model.findAll({
      where: { [Op.and]: conditions },
      order: [
        ['startedAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: page.limit + 1,
    })

    return rows.map((row) => this.toRecord(row.get({ plain: true })))
  }

  async findOne(researchId: string, runId: string): Promise<AiRunRecord | null> {
    const row = await this.model.findOne({ where: { id: runId, researchId } })
    if (!row) return null

    return this.toRecord(row.get({ plain: true }))
  }

  private toRecord(plain: AiRunModel): AiRunRecord {
    return {
      id: plain.id,
      researchId: plain.researchId,
      tool: plain.tool,
      kind: plain.kind,
      status: plain.status,
      error: plain.error,
      output: plain.output,
      createdAt: plain.startedAt,
      finishedAt: plain.finishedAt,
    }
  }
}
