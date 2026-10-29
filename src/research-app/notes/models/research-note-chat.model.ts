import { CHAT_ROLE_VALUES, type ChatRole } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchNoteModel } from './research-note.model'

@Table({ tableName: 'research_note_chats', underscored: true, timestamps: true, updatedAt: false })
export class ResearchNoteChatModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchNoteModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare noteId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [CHAT_ROLE_VALUES] } })
  declare role: ChatRole

  @Column({ type: DataType.TEXT, allowNull: false })
  declare message: string

  @Column({ type: DataType.JSONB, allowNull: true })
  declare attachments: unknown[] | null

  @Column({ type: DataType.JSONB, allowNull: true })
  declare metadata: Record<string, unknown> | null

  @Column({ type: DataType.UUID, allowNull: true })
  declare llmRunId: string | null

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchNoteModel, { foreignKey: 'noteId', onDelete: 'CASCADE' })
  declare note?: ResearchNoteModel
}
