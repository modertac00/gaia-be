import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

/** A paper the AI suggests reading. It is not a source of the research until the user adds it, so sourceId has no foreign key. */
@Table({ tableName: 'research_reading_list', underscored: true, timestamps: true, updatedAt: false })
export class ReadingListEntryModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.UUID, allowNull: false })
  declare sourceId: string

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare rank: number

  @Column({ type: DataType.TEXT, allowNull: false })
  declare reason: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare title: string

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare authors: string[]

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare year: number | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare venue: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare doi: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare paperUrl: string | null

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare citedByCount: number | null

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
