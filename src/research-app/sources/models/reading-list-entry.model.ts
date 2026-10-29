import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { SourceModel } from './source.model'

@Table({ tableName: 'research_reading_list', underscored: true, timestamps: true, updatedAt: false })
export class ReadingListEntryModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sourceId: string

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare rank: number

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel

  @BelongsTo(() => SourceModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare source?: SourceModel
}
