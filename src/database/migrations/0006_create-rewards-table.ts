import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('reward_source', ['CASHBACK', 'REDEMPTION']);

  pgm.createTable('rewards', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    transaction_id: {
      type: 'uuid',
      references: 'transactions',
      onDelete: 'SET NULL',
    },
    points: { type: 'integer', notNull: true },
    source: { type: 'reward_source', notNull: true },
    description: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('rewards');
  pgm.dropType('reward_source');
}
