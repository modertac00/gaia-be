// src/database/migrations/<YYYYMMDDHHmmss>-create-__table__.ts
import { DataTypes } from 'sequelize'
import type { Migration } from '../migrator'

const TABLE = '__table__'

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      TABLE,
      {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
        owner_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'app_users', key: 'id' },
          onDelete: 'CASCADE',
        },
        title: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'requested' },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      { transaction },
    )
    // Snapshot of __FEATURE___STATUS_VALUES today; adding a value later = a new migration.
    await queryInterface.addConstraint(TABLE, {
      type: 'check',
      fields: ['status'],
      where: { status: ['requested', 'queued', 'archived'] },
      name: `${TABLE}_status_check`,
      transaction,
    })
  })
}

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable(TABLE)
}

// Status values are copied into the migration on purpose: a migration is a frozen
// snapshot and must not change when the contract list changes later.
