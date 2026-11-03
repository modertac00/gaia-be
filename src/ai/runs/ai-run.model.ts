import {
  ACTIVITY_TOOL_VALUES,
  AI_RUN_KIND_VALUES,
  AI_RUN_STATUS_VALUES,
  type ActivityTool,
  type AiError,
  type AiRunKind,
  type AiRunStatus,
} from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'llm_runs', underscored: true, timestamps: false })
export class AiRunModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [ACTIVITY_TOOL_VALUES] } })
  declare tool: ActivityTool

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [AI_RUN_KIND_VALUES] } })
  declare kind: AiRunKind

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [AI_RUN_STATUS_VALUES] } })
  declare status: AiRunStatus

  @Column({ type: DataType.JSONB, allowNull: true })
  declare error: AiError | null

  @Column({ type: DataType.JSONB, allowNull: true })
  declare output: unknown

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare startedAt: Date

  @Column({ type: DataType.DATE, allowNull: true })
  declare finishedAt: Date | null

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
