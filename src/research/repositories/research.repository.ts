import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op, type Order, type WhereOptions, literal } from 'sequelize'
import { escapeLike } from '@/common/database/cursor-pagination'
import type { CursorPosition } from '@/common/database/cursor-pagination'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  NewResearch,
  ResearchChanges,
  ResearchListFilter,
  ResearchRecord,
} from '@/research/interfaces/research-repository.interface'
import { ResearchSupervisorModel } from '@/research/models/research-supervisor.model'
import { ResearchModel } from '@/research/models/research.model'

const LIST_ORDER: Order = [
  ['createdAt', 'DESC'],
  ['id', 'DESC'],
]

const SUPERVISED_BY_USER = literal('(select research_id from research_supervisors where user_id = :userId)')

@Injectable()
export class ResearchRepository {
  constructor(
    @InjectModel(ResearchModel) private readonly researchModel: typeof ResearchModel,
    @InjectModel(ResearchSupervisorModel) private readonly supervisorModel: typeof ResearchSupervisorModel,
  ) { }

  async create(input: NewResearch, options: RepositoryOptions = {}): Promise<ResearchRecord> {
    const row = await this.researchModel.create({ ...input }, { transaction: options.transaction })
    return this.toRecord(row.get({ plain: true }), [])
  }

  async replaceSupervisors(
    researchId: string,
    ownerId: string,
    userIds: string[],
    options: RepositoryOptions = {},
  ): Promise<boolean> {

    const owned = await this.researchModel.count({
      where: { id: researchId, createdBy: ownerId },
      transaction: options.transaction,
    })
    if (!owned) return false

    await this.supervisorModel.destroy({ where: { researchId }, transaction: options.transaction })
    if (!userIds.length) return true

    await this.supervisorModel.bulkCreate(
      userIds.map((userId) => ({ researchId, userId })),
      { transaction: options.transaction },
    )
    return true
  }

  async findVisiblePage(
    userId: string,
    filter: ResearchListFilter,
    page: { after: CursorPosition | null; limit: number },
  ): Promise<ResearchRecord[]> {

    const conditions: WhereOptions[] = [this.visibleTo(userId)]

    if (filter.status) conditions.push({ status: filter.status })
    if (filter.researchType) conditions.push({ researchType: filter.researchType })

    if (filter.search) {
      const pattern = `%${escapeLike(filter.search)}%`
      conditions.push({ [Op.or]: [{ title: { [Op.iLike]: pattern } }, { description: { [Op.iLike]: pattern } }] })
    }

    if (page.after) {
      const { createdAt, id } = page.after
      conditions.push({ [Op.or]: [{ createdAt: { [Op.lt]: createdAt } }, { createdAt, id: { [Op.lt]: id } }] })
    }

    const rows = await this.researchModel.findAll({
      where: { [Op.and]: conditions },
      order: LIST_ORDER,
      limit: page.limit + 1,
      replacements: { userId },
    })
    return this.toRecords(rows)
  }

  async findVisibleById(id: string, userId: string, options: RepositoryOptions = {}): Promise<ResearchRecord | null> {
    const row = await this.researchModel.findOne({
      where: { [Op.and]: [{ id }, this.visibleTo(userId)] },
      replacements: { userId },
      transaction: options.transaction,
    })
    return row ? (await this.toRecords([row], options))[0] : null
  }

  async findOwnedById(id: string, ownerId: string, options: RepositoryOptions = {}): Promise<ResearchRecord | null> {
    const row = await this.researchModel.findOne({
      where: { id, createdBy: ownerId },
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return row ? (await this.toRecords([row], options))[0] : null
  }

  async update(id: string, ownerId: string, changes: ResearchChanges, options: RepositoryOptions = {}): Promise<void> {
    const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined))

    await this.researchModel.update(defined, {
      where: { id, createdBy: ownerId },
      transaction: options.transaction,
    })
  }

  private visibleTo(userId: string): WhereOptions {
    return { [Op.or]: [{ createdBy: userId }, { id: { [Op.in]: SUPERVISED_BY_USER } }] }
  }

  private async toRecords(rows: ResearchModel[], options: RepositoryOptions = {}): Promise<ResearchRecord[]> {
    if (!rows.length) return []

    const supervisors = await this.supervisorModel.findAll({
      where: { researchId: { [Op.in]: rows.map((row) => row.id) } },
      attributes: ['researchId', 'userId'],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction: options.transaction,
    })
    const supervisorIdsByResearch = new Map<string, string[]>()
    for (const { researchId, userId } of supervisors) {
      supervisorIdsByResearch.set(researchId, [...(supervisorIdsByResearch.get(researchId) ?? []), userId])
    }

    return rows.map((row) => {
      const plain = row.get({ plain: true })
      return this.toRecord(plain, supervisorIdsByResearch.get(plain.id) ?? [])
    })
  }

  private toRecord(plain: ResearchModel, supervisorIds: string[]): ResearchRecord {
    return {
      id: plain.id,
      docKey: plain.docKey,
      title: plain.title,
      description: plain.description,
      researchType: plain.researchType,
      status: plain.status,
      citationStyle: plain.citationStyle,
      pubYearFrom: plain.pubYearFrom,
      pubYearTo: plain.pubYearTo,
      minSources: plain.minSources,
      createdBy: plain.createdBy,
      scopeNotes: plain.scopeNotes,
      aiInstructions: plain.aiInstructions,
      approvedByUserId: plain.approvedByUserId,
      counts: {
        identified: plain.identified,
        duplicates: plain.duplicates,
        screened: plain.screened,
        excluded: plain.excluded,
        fullText: plain.fullText,
        included: plain.included,
      },
      supervisorIds,
      clarification: plain.clarification,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    } satisfies ResearchRecord
  }
}
