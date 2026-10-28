import {
  SOURCE_RESOLUTION_VALUES,
  SOURCE_STANCE_VALUES,
  SOURCE_TIER_VALUES,
  type SourceResolution,
  type SourceStance,
  type SourceTier,
} from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany, HasOne, Model, Table, UpdatedAt } from 'sequelize-typescript'
import { ResearchModel } from '@/research/models/research.model'
import { SourceChatModel } from './source-chat.model'
import { SourceClassificationHistoryModel } from './source-classification-history.model'
import { SourceScreeningModel } from './source-screening.model'

@Table({ tableName: 'source', underscored: true, timestamps: true })
export class SourceModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare marker: number

  @Column({ type: DataType.TEXT, allowNull: false })
  declare title: string

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare authors: string[]

  @Column({ type: DataType.TEXT, allowNull: true })
  declare venue: string | null

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare publicationYear: number | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare doi: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare url: string | null

  @Column({ type: DataType.TEXT, allowNull: true, validate: { isIn: [SOURCE_TIER_VALUES] } })
  declare tier: SourceTier | null

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare citedByCount: number

  @Column({ type: DataType.TEXT, allowNull: true })
  declare contentSummarization: string | null

  @Column({ type: DataType.TEXT, allowNull: true, validate: { isIn: [SOURCE_STANCE_VALUES] } })
  declare classificationType: SourceStance | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare classifiedBy: string | null

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isVerified: boolean

  @Column({ type: DataType.UUID, allowNull: true })
  declare verifiedBy: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare verifiedAt: Date | null

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: 'pending', validate: { isIn: [SOURCE_RESOLUTION_VALUES] } })
  declare resolution: SourceResolution

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare includedInResearch: boolean

  @Column({ type: DataType.TEXT, allowNull: false })
  declare createdBy: string

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel

  @HasMany(() => SourceClassificationHistoryModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare classificationHistory?: SourceClassificationHistoryModel[]

  @HasOne(() => SourceScreeningModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare screening?: SourceScreeningModel

  @HasMany(() => SourceChatModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare chats?: SourceChatModel[]
}
