import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('transaction_type', [
    'DEPOSIT',
    'WITHDRAWAL',
    'SWAP',
    'BUY',
    'REWARD_CASHBACK',
    'TRANSFER',
  ]);

  pgm.createType('transaction_status', ['PENDING', 'COMPLETED', 'FAILED']);

  pgm.createTable('transactions', {
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
    transaction_type: { type: 'transaction_type', notNull: true },
    from_currency: { type: 'varchar(3)' },
    to_currency: { type: 'varchar(3)' },
    amount_sent: { type: 'decimal(18,2)' },
    amount_received: { type: 'decimal(18,2)' },
    exchange_rate: { type: 'decimal(18,6)' },
    status: { type: 'transaction_status', notNull: true, default: 'PENDING' },
    failed_reason: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('transactions', 'transactions_amounts_non_negative', {
    check: 'amount_sent >= 0 AND amount_received >= 0',
  });

  pgm.createIndex('transactions', ['wallet_id', 'created_at']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('transactions');
  pgm.dropType('transaction_status');
  pgm.dropType('transaction_type');
}
