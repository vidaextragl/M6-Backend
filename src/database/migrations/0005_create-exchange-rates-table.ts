import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('exchange_rates', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    from_currency: { type: 'varchar(3)', notNull: true },
    to_currency: { type: 'varchar(3)', notNull: true },
    rate: { type: 'decimal(18,6)', notNull: true },
    provider: { type: 'varchar(50)', notNull: true },
    fetched_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('exchange_rates', 'exchange_rates_currency_pair_unique', {
    unique: ['from_currency', 'to_currency'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('exchange_rates');
}
