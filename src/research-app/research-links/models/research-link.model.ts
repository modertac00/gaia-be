import { RESEARCH_LINK_TARGET_TYPE_VALUES, type ResearchLinkTargetType } from '@moderta/api-contracts/gaia'
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import { ResearchModel } from '@/research-app/research/models/research.model'

@Table({ tableName: 'research_links', underscored: true, timestamps: true, updatedAt: false })
export class ResearchLinkModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4, allowNull: false })
  declare id: string

  @ForeignKey(() => ResearchModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare researchId: string

  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [RESEARCH_LINK_TARGET_TYPE_VALUES] } })
  declare targetType: ResearchLinkTargetType

  @Column({ type: DataType.UUID, allowNull: false })
  declare targetId: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare label: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare status: string

  @CreatedAt
  declare createdAt: Date

  @BelongsTo(() => ResearchModel, { foreignKey: 'researchId', onDelete: 'CASCADE' })
  declare research?: ResearchModel
}
