import {
  CITATION_STYLE_VALUES,
  EXPORT_FORMAT_VALUES,
  EXPORT_SCOPE_VALUES,
  EXPORT_STATUS_VALUES,
  type CitationStyle,
  type ExportFormat,
  type ExportScope,
  type ExportStatus,
} from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'exports', underscored: true, timestamps: true, updatedAt: false })
export class ExportModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [EXPORT_FORMAT_VALUES] } })
  declare format: ExportFormat

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [CITATION_STYLE_VALUES] } })
  declare style: CitationStyle

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [EXPORT_SCOPE_VALUES] } })
  declare scope: ExportScope

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [EXPORT_STATUS_VALUES] } })
  declare status: ExportStatus

  @Column({ type: DataType.JSONB, allowNull: true })
  declare blockers: Record<string, unknown> | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare fileKey: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare expiresAt: Date | null

  @Column({ type: DataType.UUID, allowNull: false })
  declare requestedBy: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
