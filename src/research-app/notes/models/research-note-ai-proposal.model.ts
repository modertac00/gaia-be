import { NOTE_PROPOSAL_STATUS_VALUES, type NoteProposalContent, type NoteProposalStatus } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchNoteModel } from './research-note.model'

/** A suggestion from the tool that stays out of the note until a person accepts it. */
@Table({ tableName: 'research_note_ai_proposals', underscored: true, timestamps: true, updatedAt: false })
export class ResearchNoteAiProposalModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchNoteModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare noteId: string

  @Column({ type: DataType.UUID, allowNull: true })
  declare runId: string | null

  @Column({ type: DataType.JSONB, allowNull: false })
  declare contentJson: NoteProposalContent

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [NOTE_PROPOSAL_STATUS_VALUES] } })
  declare status: NoteProposalStatus

  @Column({ type: DataType.UUID, allowNull: true })
  declare resolvedBy: string | null

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchNoteModel, { foreignKey: 'noteId', onDelete: 'CASCADE' })
  declare note?: ResearchNoteModel
}
