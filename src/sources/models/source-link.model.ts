import { SOURCE_LINK_KIND_VALUES, type SourceLinkKind } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research/models/research.model'
import { SourceModel } from './source.model'

@Table({ tableName: 'source_links', underscored: true, timestamps: true, updatedAt: false })
export class SourceLinkModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare fromSourceId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare toSourceId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [SOURCE_LINK_KIND_VALUES] } })
  declare kind: SourceLinkKind

  @Column({ type: DataType.DECIMAL, allowNull: false, defaultValue: 1 })
  declare weight: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel

  @BelongsTo(() => SourceModel, { foreignKey: 'fromSourceId', onDelete: 'CASCADE' })
  declare fromSource?: SourceModel

  @BelongsTo(() => SourceModel, { foreignKey: 'toSourceId', onDelete: 'CASCADE' })
  declare toSource?: SourceModel
}
