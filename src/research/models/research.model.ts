import {
  CITATION_STYLE_VALUES,
  type CitationStyle,
  RESEARCH_STATUS_VALUES,
  RESEARCH_TYPE_VALUES,
  type ResearchClarification,
  type ResearchStatus,
  type ResearchType,
} from '@moderta/api-contracts/gaia'
import { literal } from 'sequelize'
import { Column, CreatedAt, DataType, HasMany, Model, Table, UpdatedAt } from 'sequelize-typescript'
import { ResearchSupervisorModel } from './research-supervisor.model'

@Table({ tableName: 'research', underscored: true, timestamps: true })
export class ResearchModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: literal('DEFAULT') })
  declare docKey: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare title: string

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [RESEARCH_TYPE_VALUES] } })
  declare researchType: ResearchType

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [RESEARCH_STATUS_VALUES] } })
  declare status: ResearchStatus

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [CITATION_STYLE_VALUES] } })
  declare citationStyle: CitationStyle

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare pubYearFrom: number

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare pubYearTo: number

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare minSources: number

  @Column({ type: DataType.UUID, allowNull: false })
  declare createdBy: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare scopeNotes: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare aiInstructions: string

  @Column({ type: DataType.UUID, allowNull: true })
  declare approvedByUserId: string | null

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare identified: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare duplicates: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare screened: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare excluded: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare fullText: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare included: number

  @Column({ type: DataType.JSONB, allowNull: true })
  declare clarification: ResearchClarification | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @HasMany(() => ResearchSupervisorModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare supervisors?: ResearchSupervisorModel[]
}
