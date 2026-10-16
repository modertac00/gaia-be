import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op, type WhereOptions } from 'sequelize'
import type {
  __Feature__Status,
  Create__Feature__Dto,
  List__Feature__Query,
  Update__Feature__Dto,
} from '@moderta/api-contracts/gaia'
import {
  CURSOR_ORDER,
  cursorWhere,
  escapeLike,
  toRecordPage,
  type RecordPage,
} from '../../../common/database/cursor-pagination'
import type { RepositoryOptions } from '../../../common/database/repository-options'
import { __Feature__Model } from '../models/__feature__.model'
import type { __Feature__Record, __Feature__Repository } from './__feature__.repository'

@Injectable()
export class Sequelize__Feature__Repository implements __Feature__Repository {
  constructor(@InjectModel(__Feature__Model) private readonly model: typeof __Feature__Model) {}

  async findOwnedById(id: string, ownerId: string, options: RepositoryOptions = {}): Promise<__Feature__Record | null> {
    const row = await this.model.findOne({ where: { id, ownerId }, transaction: options.transaction })
    return row ? toRecord(row) : null
  }

  async listOwned(ownerId: string, query: List__Feature__Query): Promise<RecordPage<__Feature__Record>> {
    const filters: WhereOptions<__Feature__Model> = {
      ownerId,
      ...(query.status && { status: query.status }),
      ...(query.search && { title: { [Op.iLike]: `%${escapeLike(query.search)}%` } }),
    }
    const rows = await this.model.findAll({
      where: { [Op.and]: [filters, cursorWhere(query.cursor)] },
      order: CURSOR_ORDER,
      limit: query.limit + 1,
    })
    return toRecordPage(rows.map(toRecord), query.limit)
  }

  async create(ownerId: string, input: Create__Feature__Dto, options: RepositoryOptions = {}): Promise<__Feature__Record> {
    const row = await this.model.create({ ...input, ownerId }, { transaction: options.transaction })
    return toRecord(row)
  }

  async updateOwned(
    id: string,
    ownerId: string,
    input: Update__Feature__Dto,
    options: RepositoryOptions = {},
  ): Promise<__Feature__Record | null> {
    const [count, rows] = await this.model.update(input, {
      where: { id, ownerId },
      returning: true,
      transaction: options.transaction,
    })
    return count > 0 ? toRecord(rows[0]) : null
  }

  async archiveOwned(id: string, ownerId: string, options: RepositoryOptions = {}): Promise<boolean> {
    const [count] = await this.model.update(
      { status: 'archived' satisfies __Feature__Status },
      { where: { id, ownerId }, transaction: options.transaction },
    )
    return count > 0
  }
}

function toRecord(row: __Feature__Model): __Feature__Record {
  return row.get({ plain: true })
}
