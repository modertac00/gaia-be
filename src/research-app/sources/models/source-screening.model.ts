import { SCREENING_STAGE_VALUES, type ScreeningStage } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { SourceModel } from './source.model'

@Table({ tableName: 'source_screening', underscored: true, timestamps: true, updatedAt: false })
export class SourceScreeningModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sourceId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [SCREENING_STAGE_VALUES] } })
  declare stage: ScreeningStage

  @Column({ type: DataType.TEXT, allowNull: true })
  declare exclusionReason: string | null

  @Column({ type: DataType.TEXT, allowNull: false })
  declare decidedBy: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel

  @BelongsTo(() => SourceModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare source?: SourceModel
}
