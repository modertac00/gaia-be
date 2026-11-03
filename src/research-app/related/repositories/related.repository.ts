import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { PublicationYearCount, SourceLink } from '@moderta/api-contracts/gaia'
import { col, fn, Op } from 'sequelize'
import type { RepositoryOptions } from '@/common/database/repository-options'
import type {
  LockedResearch,
  ReadingListRecord,
  SourceLinkRecord,
} from '@/research-app/related/interfaces/related-repository.interface'
import { ReadingListEntryModel } from '@/research-app/related/models/reading-list-entry.model'
import { SourceLinkModel } from '@/research-app/related/models/source-link.model'
import { ResearchModel } from '@/research-app/research/models/research.model'
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
      order: [
        ['rank', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => this.toReadingListRecord(row))
  }

  async findReadingListEntry(researchId: string, sourceId: string, options: RepositoryOptions = {}): Promise<ReadingListRecord | null> {
    const row = await this.readingListModel.findOne({ where: { researchId, sourceId }, transaction: options.transaction })
    return row ? this.toReadingListRecord(row) : null
  }

  async deleteReadingListEntry(researchId: string, sourceId: string, options: RepositoryOptions = {}): Promise<void> {
    await this.readingListModel.destroy({ where: { researchId, sourceId }, transaction: options.transaction })
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
   * Returns null when the research does not exist.
   */
  async lockResearch(researchId: string, options: RepositoryOptions = {}): Promise<LockedResearch | null> {
    const research = await this.researchModel.findByPk(researchId, {
      attributes: ['id', 'relatedLinksGeneratedAt'],
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined,
    })
    return research ? { relatedLinksGeneratedAt: research.relatedLinksGeneratedAt } : null
  }

  async saveLinksGeneratedAt(researchId: string, generatedAt: Date, options: RepositoryOptions = {}): Promise<void> {
    await this.researchModel.update({ relatedLinksGeneratedAt: generatedAt }, { where: { id: researchId }, transaction: options.transaction })
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

  async createReadingList(researchId: string, entries: ReadingListRecord[], options: RepositoryOptions = {}): Promise<void> {
    const values = entries.map((entry) => ({ ...entry, researchId }))
    await this.readingListModel.bulkCreate(values, { transaction: options.transaction })
  }

  private toReadingListRecord(row: ReadingListEntryModel): ReadingListRecord {
    return {
      rank: row.rank,
      sourceId: row.sourceId,
      reason: row.reason,
      title: row.title,
      authors: row.authors,
      year: row.year,
      venue: row.venue,
      doi: row.doi,
      paperUrl: row.paperUrl,
      citedByCount: row.citedByCount,
    }
  }
}
