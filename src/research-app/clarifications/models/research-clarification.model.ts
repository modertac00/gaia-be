import {
  CLARIFICATION_STATUS_VALUES,
  type AiError,
  type ClarificationDraft,
  type ClarificationStatus,
  type RequestClarificationDto,
} from '@moderta/api-contracts/gaia'
import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from 'sequelize-typescript'

@Table({ tableName: 'research_clarifications', underscored: true, timestamps: true })
export class ResearchClarificationModel extends Model {
  // The id is also the AI task id.
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @Column({ type: DataType.UUID, allowNull: false })
  declare createdBy: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [CLARIFICATION_STATUS_VALUES] } })
  declare status: ClarificationStatus

  @Column({ type: DataType.JSONB, allowNull: false })
  declare brief: RequestClarificationDto

  @Column({ type: DataType.JSONB, allowNull: true })
  declare suggestedQuestion: ClarificationDraft['suggestedQuestion']

  @Column({ type: DataType.JSONB, allowNull: true })
  declare questions: ClarificationDraft['questions']

  @Column({ type: DataType.JSONB, allowNull: true })
  declare error: AiError | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
