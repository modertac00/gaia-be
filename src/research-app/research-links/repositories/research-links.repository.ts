import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { ResearchLinkRecord } from '@/research-app/research-links/interfaces/research-links-repository.interface'
import { ResearchLinkModel } from '@/research-app/research-links/models/research-link.model'

@Injectable()
export class ResearchLinksRepository {
  constructor(@InjectModel(ResearchLinkModel) private readonly linkModel: typeof ResearchLinkModel) { }

  async findAll(researchId: string): Promise<ResearchLinkRecord[]> {
    const rows = await this.linkModel.findAll({
      where: { researchId },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    })
    return rows.map((row) => this.toRecord(row))
  }

  private toRecord(row: ResearchLinkModel): ResearchLinkRecord {
    return {
      id: row.id,
      researchId: row.researchId,
      targetType: row.targetType,
      targetId: row.targetId,
      label: row.label,
      status: row.status,
      createdAt: row.createdAt,
    }
  }
}
