import {
  ACTIVITY_ACTOR_TYPE_VALUES,
  ACTIVITY_RESULT_VALUES,
  ACTIVITY_TARGET_TYPE_VALUES,
  ACTIVITY_TOOL_VALUES,
  type ActivityActorType,
  type ActivityResult,
  type ActivityTargetType,
  type ActivityTool,
} from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'activity_events', underscored: true, timestamps: false })
export class ActivityEventModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [ACTIVITY_TOOL_VALUES] } })
  declare tool: ActivityTool

  @Column({ type: DataType.TEXT, allowNull: false })
  declare action: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [ACTIVITY_TARGET_TYPE_VALUES] } })
  declare targetType: ActivityTargetType

  @Column({ type: DataType.UUID, allowNull: true })
  declare targetId: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare targetLabel: string | null

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [ACTIVITY_ACTOR_TYPE_VALUES] } })
  declare actorType: ActivityActorType

  @Column({ type: DataType.UUID, allowNull: true })
  declare actorUserId: string | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare runId: string | null

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [ACTIVITY_RESULT_VALUES] } })
  declare result: ActivityResult

  @Column({ type: DataType.TEXT, allowNull: true })
  declare reason: string | null

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare occurredAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
