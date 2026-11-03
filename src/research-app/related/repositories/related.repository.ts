import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { PublicationYearCount, SourceLink } from '@moderta/api-contracts/gaia'
import { col, fn, Op } from 'sequelize'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  NewReadingListEntry,
  ReadingListRecord,
  SourceLinkRecord,
} from '@/research-app/related/interfaces/related-repository.interface'
import { ReadingListEntryModel } from '@/research-app/related/models/reading-list-entry.model'
import { SourceLinkModel } from '@/research-app/related/models/source-link.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
import type { SourceRecord } from '@/research-app/sources/interfaces/sources-repository.interface'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Injectable()
export class RelatedRepository {
  constructor(
    @InjectModel(SourceLinkModel) private readonly linkModel: typeof SourceLinkModel,
    @InjectModel(ReadingListEntryModel) private readonly readingListModel: typeof ReadingListEntryModel,
    @InjectModel(ResearchModel) private readonly researchModel: typeof ResearchModel,
    @InjectModel(SourceModel) private readonly sourceModel: typeof SourceModel,
  ) { }

  async findLinks(researchId: string): Promise<SourceLinkRecord[]> {
    const rows = await this.linkModel.findAll({
      where: { researchId },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => ({
      fromSourceId: row.fromSourceId,
      toSourceId: row.toSourceId,
      kind: row.kind,
      weight: Number(row.weight),
    }))
  }

  async findReadingList(researchId: string): Promise<ReadingListRecord[]> {
    const rows = await this.readingListModel.findAll({
      where: { researchId },
      include: [{ model: SourceModel, required: true }],
      order: [
        ['rank', 'ASC'],
        ['id', 'ASC'],
      ],
    })

    const entries: ReadingListRecord[] = []
    for (const row of rows) {
      if (row.source) {
        entries.push({ rank: row.rank, source: this.toSourceRecord(row.source) })
      }
    }
    return entries
  }

  /** Number of included sources per publication year, oldest year first. Sources without a year are skipped. */
  async countIncludedByYear(researchId: string): Promise<PublicationYearCount[]> {
    const rows = await this.sourceModel.findAll({
      attributes: ['publicationYear', [fn('COUNT', col('id')), 'count']],
      where: { researchId, includedInResearch: true, publicationYear: { [Op.ne]: null } },
      group: ['publicationYear'],
      order: [['publicationYear', 'ASC']],
      raw: true,
    })

    return rows.map((row) => {
      const plain = row as unknown as { publicationYear: number; count: string }
      return { year: plain.publicationYear, count: Number(plain.count) }
    })
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

  /** The ids of every source of the research. */
  async findResearchSourceIds(researchId: string, options: RepositoryOptions = {}): Promise<string[]> {
    const sources = await this.sourceModel.findAll({
      attributes: ['id'],
      where: { researchId },
      transaction: options.transaction,
    })
    return sources.map((source) => source.id)
  }

  /** Removes the links and the reading list of the research. */
  async deleteAll(researchId: string, options: RepositoryOptions = {}): Promise<void> {
    await this.linkModel.destroy({ where: { researchId }, transaction: options.transaction })
    await this.readingListModel.destroy({ where: { researchId }, transaction: options.transaction })
  }

  async createLinks(researchId: string, links: SourceLink[], options: RepositoryOptions = {}): Promise<void> {
    const values = links.map((link) => ({ ...link, researchId }))
    await this.linkModel.bulkCreate(values, { transaction: options.transaction })
  }

  async createReadingList(researchId: string, entries: NewReadingListEntry[], options: RepositoryOptions = {}): Promise<void> {
    const values = entries.map((entry) => ({ ...entry, researchId }))
    await this.readingListModel.bulkCreate(values, { transaction: options.transaction })
  }

  private toSourceRecord(source: SourceModel): SourceRecord {
    return {
      id: source.id,
      researchId: source.researchId,
      marker: source.marker,
      title: source.title,
      authors: source.authors,
      venue: source.venue,
      publicationYear: source.publicationYear,
      doi: source.doi,
      url: source.url,
      tier: source.tier,
      citedByCount: source.citedByCount,
      contentSummarization: source.contentSummarization,
      stance: source.classificationType,
      classifiedBy: source.classifiedBy,
      isVerified: source.isVerified,
      verifiedBy: source.verifiedBy,
      verifiedAt: source.verifiedAt,
      resolution: source.resolution,
      includedInResearch: source.includedInResearch,
      createdBy: source.createdBy,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    }
  }
}
