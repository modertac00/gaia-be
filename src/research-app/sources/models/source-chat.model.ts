import { CHAT_ROLE_VALUES, type ChatRole } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { SourceModel } from './source.model'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'source_chats', underscored: true, timestamps: true, updatedAt: false })
export class SourceChatModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @ForeignKey(() => SourceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sourceId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [CHAT_ROLE_VALUES] } })
  declare role: ChatRole

  @Column({ type: DataType.TEXT, allowNull: false })
  declare message: string

  @Column({ type: DataType.JSONB, allowNull: true })
  declare attachments: unknown[] | null

  @Column({ type: DataType.JSONB, allowNull: true })
  declare metadata: Record<string, unknown> | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare userId: string | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare llmRunId: string | null

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => SourceModel, { foreignKey: 'sourceId', onDelete: 'CASCADE' })
  declare source?: SourceModel

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
