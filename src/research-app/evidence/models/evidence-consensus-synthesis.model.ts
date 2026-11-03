import { CONSENSUS_VERDICT_VALUES, type ConsensusVerdict } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

/** The AI's reading of what the evidence says about the research question. One per research. */
@Table({ tableName: 'evidence_consensus_syntheses', underscored: true, timestamps: false })
export class EvidenceConsensusSynthesisModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  declare researchId: string

  @Column({ type: DataType.UUID, allowNull: true })
  declare runId: string | null

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [CONSENSUS_VERDICT_VALUES] } })
  declare verdict: ConsensusVerdict

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare supporting: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare mixed: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare contradicting: number

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare generatedAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
