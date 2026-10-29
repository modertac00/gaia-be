import { SOURCE_STANCE_VALUES, type SourceStance } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { SourceModel } from './source.model'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'source_classification_history', underscored: true, timestamps: true, updatedAt: false })
export class SourceClassificationHistoryModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sourceId: string

  @Column({ type: DataType.TEXT, allowNull: true, validate: { isIn: [SOURCE_STANCE_VALUES] } })
  declare fromClass: SourceStance | null

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [SOURCE_STANCE_VALUES] } })
  declare toClass: SourceStance

  @Column({ type: DataType.TEXT, allowNull: true })
  declare reason: string | null

  @Column({ type: DataType.UUID, allowNull: false })
  declare changedBy: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => SourceModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare source?: SourceModel

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
