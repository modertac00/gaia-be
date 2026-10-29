import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { AuditFinding, NoteContent } from '@moderta/api-contracts/gaia'
import { Op, type WhereOptions } from 'sequelize'
import type { CursorPosition } from '@/common/database/cursor-pagination'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  ActivityRecord,
  AuditFindingRecord,
  NewActivityEvent,
  SourceAuditRecord,
} from '@/research-app/audit/interfaces/audit-repository.interface'
import { ActivityEventModel } from '@/research-app/audit/models/activity-event.model'
import { AuditFindingModel } from '@/research-app/audit/models/audit-finding.model'
import { ResearchNoteModel } from '@/research-app/notes/models/research-note.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Injectable()
export class AuditRepository {
  constructor(
    @InjectModel(ActivityEventModel) private readonly activityModel: typeof ActivityEventModel,
    @InjectModel(AuditFindingModel) private readonly findingModel: typeof AuditFindingModel,
    @InjectModel(ResearchModel) private readonly researchModel: typeof ResearchModel,
    @InjectModel(ResearchNoteModel) private readonly noteModel: typeof ResearchNoteModel,
    @InjectModel(SourceModel) private readonly sourceModel: typeof SourceModel,
  ) { }

  async createActivity(event: NewActivityEvent, options: RepositoryOptions = {}): Promise<void> {
    await this.activityModel.create(
      {
        researchId: event.researchId,
        tool: event.tool,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId ?? null,
        targetLabel: event.targetLabel ?? null,
        actorType: event.actorType,
        actorUserId: event.actorUserId ?? null,
        runId: event.runId ?? null,
        result: event.result,
        reason: event.reason ?? null,
      },
      { transaction: options.transaction },
    )
  }

  async findActivityPage(researchId: string, page: { after: CursorPosition | null; limit: number }): Promise<ActivityRecord[]> {
    const conditions: WhereOptions[] = [{ researchId }]

    if (page.after) {
      const occurredAt = page.after.createdAt
      const { id } = page.after
      conditions.push({ [Op.or]: [{ occurredAt: { [Op.lt]: occurredAt } }, { occurredAt, id: { [Op.lt]: id } }] })
    }

    const rows = await this.activityModel.findAll({
      where: { [Op.and]: conditions },
      order: [
        ['occurredAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: page.limit + 1,
    })

    return rows.map((row) => this.toActivityRecord(row.get({ plain: true })))
  }

  async findFindings(researchId: string): Promise<AuditFindingRecord[]> {
    const rows = await this.findingModel.findAll({
      where: { researchId },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => ({ type: row.type, detail: row.detail, severity: row.severity }))
  }

  /** Reads the notes module's table: the content of the research's latest note version, or null when it has no note. */
  async findLatestNoteContent(researchId: string): Promise<NoteContent | null> {
    const note = await this.noteModel.findOne({
      attributes: ['content'],
      where: { researchId },
      order: [['version', 'DESC']],
    })
    if (!note) return null

    return note.content
  }

  /** Reads the sources module's table: marker, resolution and tier of every included source, by citation number. */
  async findIncludedSourcesForAudit(researchId: string): Promise<SourceAuditRecord[]> {
    const rows = await this.sourceModel.findAll({
      attributes: ['marker', 'resolution', 'tier'],
      where: { researchId, includedInResearch: true },
      order: [['marker', 'ASC']],
    })
    return rows.map((row) => ({ marker: row.marker, resolution: row.resolution, tier: row.tier }))
  }

  /**
   * Locks the research row until the transaction ends, so two deliveries of the same AI result run one after the other.
   * Returns false when the research does not exist.
   */
  async lockResearch(researchId: string, options: RepositoryOptions = {}): Promise<boolean> {
    const research = await this.researchModel.findByPk(researchId, {
      attributes: ['id'],
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return research !== null
  }

  async deleteFindings(researchId: string, options: RepositoryOptions = {}): Promise<void> {
    await this.findingModel.destroy({ where: { researchId }, transaction: options.transaction })
  }

  async createFindings(researchId: string, findings: AuditFinding[], runId: string, options: RepositoryOptions = {}): Promise<void> {
    const values = findings.map((finding) => ({ ...finding, researchId, runId }))
    await this.findingModel.bulkCreate(values, { transaction: options.transaction })
  }

  private toActivityRecord(plain: ActivityEventModel): ActivityRecord {
    return {
      id: plain.id,
      researchId: plain.researchId,
      tool: plain.tool,
      action: plain.action,
      targetType: plain.targetType,
      targetId: plain.targetId,
      targetLabel: plain.targetLabel,
      actorType: plain.actorType,
      actorUserId: plain.actorUserId,
      result: plain.result,
      reason: plain.reason,
      createdAt: plain.occurredAt,
    }
  }
}
