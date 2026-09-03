import 'dotenv/config';

import { pool, withTransaction } from '../client';
import { hashPassword } from '../../modules/auth/password.utils';
import { createInitialBalances, depositBalance } from '../../modules/balances/balances.repository';
import {
  recordDeposit,
  recordSwap,
  recordWithdrawal,
} from '../../modules/transactions/transactions.ledger';
import { createUser, findUserByEmail } from '../../modules/users/users.repository';
import { createWallet } from '../../modules/wallets/wallets.repository';

interface DemoUser {
  email: string;
  name: string;
  password: string;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'demo@vidaextra.com', name: 'Usuario Demo', password: '#Demo13579' },
];

async function seedUser(demo: DemoUser): Promise<void> {
  const existing = await findUserByEmail(demo.email);
  if (existing) {
    console.log(`Ya existe ${demo.email}, se salta.`);
    return;
  }

  const passwordHash = await hashPassword(demo.password);

  const walletId = await withTransaction(async (client) => {
    const user = await createUser(client, demo.email, demo.name, passwordHash);
    const wallet = await createWallet(client, user.id);
    await createInitialBalances(client, wallet.id);
    return wallet.id;
  });

  // Carga inicial de saldo (equivalente a un depósito, pero sin registrar transacción de
  // "onboarding" — el historial de la demo arranca desde el primer movimiento real de abajo).
  await withTransaction((client) => depositBalance(client, walletId, 'USD', '1000.00'));
  await withTransaction((client) => depositBalance(client, walletId, 'EUR', '500.00'));

  // Movimientos reales, para que el historial de transacciones tenga algo que mostrar en la demo.
  await withTransaction((client) => recordDeposit(client, walletId, 'USD', '200.00'));
  await withTransaction((client) => recordWithdrawal(client, walletId, 'USD', '50.00'));
  await withTransaction((client) =>
    recordSwap(client, walletId, 'USD', 'ARS', '150.00', '225000.00', 1500),
  );

  console.log(`Usuario demo creado: ${demo.email} / ${demo.password}`);
}

export async function seedDemoUsers(): Promise<void> {
  for (const demo of DEMO_USERS) {
    await seedUser(demo);
  }
}

if (require.main === module) {
  seedDemoUsers()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Error al correr el seed:', err);
      process.exit(1);
    });
}
