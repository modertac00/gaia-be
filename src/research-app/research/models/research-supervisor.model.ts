import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from './research.model'

@Table({ tableName: 'research_supervisors', underscored: true, timestamps: true, updatedAt: false })
export class ResearchSupervisorModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
