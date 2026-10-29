import type { NoteContent } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript'
import { ResearchNoteAiProposalModel } from './research-note-ai-proposal.model'
import { ResearchNoteChatModel } from './research-note-chat.model'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'research_note', underscored: true, timestamps: true, updatedAt: false })
export class ResearchNoteModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare version: number

  @Column({ type: DataType.JSONB, allowNull: false })
  declare content: NoteContent

  @Column({ type: DataType.UUID, allowNull: false })
  declare createdBy: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel

  @HasMany(() => ResearchNoteAiProposalModel, { foreignKey: 'noteId', onDelete: 'CASCADE' })
  declare proposals?: ResearchNoteAiProposalModel[]

  @HasMany(() => ResearchNoteChatModel, { foreignKey: 'noteId', onDelete: 'CASCADE' })
  declare chats?: ResearchNoteChatModel[]
}
