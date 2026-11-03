import {
  EVIDENCE_ORIGIN_VALUES,
  EVIDENCE_REVIEW_VALUES,
  EVIDENCE_STATUS_VALUES,
  type EvidenceOrigin,
  type EvidenceReview,
  type EvidenceStatus,
} from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'
import { SourceModel } from '@/research-app/sources/models/source.model'

@Table({ tableName: 'evidence_rows', underscored: true, timestamps: true, updatedAt: false })
export class EvidenceRowModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare sourceId: string | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare runId: string | null

  @Column({ type: DataType.TEXT, allowNull: false })
  declare study: string

  @Column({ type: DataType.TEXT, allowNull: true })
  declare locator: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare method: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare sample: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare reportedEffect: string | null

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [EVIDENCE_ORIGIN_VALUES] } })
  declare origin: EvidenceOrigin

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [EVIDENCE_REVIEW_VALUES] } })
  declare review: EvidenceReview

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [EVIDENCE_STATUS_VALUES] } })
  declare status: EvidenceStatus

  @Column({ type: DataType.TEXT, allowNull: true })
  declare failureReason: string | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare reviewedBy: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare reviewedAt: Date | null

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel

  @BelongsTo(() => SourceModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare source?: SourceModel
}
