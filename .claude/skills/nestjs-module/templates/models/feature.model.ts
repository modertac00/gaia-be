import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize'
import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { __FEATURE___STATUS_VALUES, type __Feature__Status } from '@moderta/api-contracts/gaia'

@Table({ tableName: '__table__', underscored: true, timestamps: true })
export class __Feature__Model extends Model<
  InferAttributes<__Feature__Model>,
  InferCreationAttributes<__Feature__Model>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: CreationOptional<string>

  @Column({ type: DataType.UUID, allowNull: false })
  declare ownerId: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare title: string

  @Default('requested')
  @Column({ type: DataType.TEXT, allowNull: false, validate: { isIn: [__FEATURE___STATUS_VALUES] } })
  declare status: CreationOptional<__Feature__Status>

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}
