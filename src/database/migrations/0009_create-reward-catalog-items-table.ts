import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('reward_catalog_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'varchar(150)', notNull: true },
    description: { type: 'varchar(500)' },
    cost_points: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('reward_catalog_items', 'reward_catalog_items_cost_points_positive', {
    check: 'cost_points > 0',
  });

  pgm.addColumn('rewards', {
    catalog_item_id: {
      type: 'uuid',
      references: 'reward_catalog_items',
      onDelete: 'SET NULL',
    },
  });

  pgm.sql(`
    INSERT INTO reward_catalog_items (name, description, cost_points) VALUES
      ('Pase de batalla', 'Battle pass de temporada para tu juego favorito', 500),
      ('Skin exclusiva', 'Skin cosmética de edición limitada', 800),
      ('Cupón 10% OFF', 'Código de descuento del 10% en tiendas participantes', 200);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('rewards', 'catalog_item_id');
  pgm.dropTable('reward_catalog_items');
}
