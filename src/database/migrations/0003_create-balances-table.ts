import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('balances', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    wallet_id: {
      type: 'uuid',
      notNull: true,
      references: 'wallets',
      onDelete: 'CASCADE',
    },
    currency: { type: 'varchar(3)', notNull: true },
    amount: { type: 'decimal(18,2)', notNull: true, default: 0 },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('balances', 'balances_wallet_currency_unique', {
    unique: ['wallet_id', 'currency'],
  });

  pgm.addConstraint('balances', 'balances_amount_non_negative', {
    check: 'amount >= 0',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('balances');
}
