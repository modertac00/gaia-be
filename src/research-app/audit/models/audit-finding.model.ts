import {
  AUDIT_FINDING_TYPE_VALUES,
  AUDIT_SEVERITY_VALUES,
  type AuditFindingType,
  type AuditSeverity,
} from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'audit_findings', underscored: true, timestamps: true, updatedAt: false })
export class AuditFindingModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [AUDIT_FINDING_TYPE_VALUES] } })
  declare type: AuditFindingType

  @Column({ type: DataType.TEXT, allowNull: false })
  declare detail: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [AUDIT_SEVERITY_VALUES] } })
  declare severity: AuditSeverity

  @Column({ type: DataType.UUID, allowNull: true })
  declare runId: string | null

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
