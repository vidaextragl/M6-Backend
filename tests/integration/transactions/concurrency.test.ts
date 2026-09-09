import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { pool, withTransaction } from '../../../src/database';
import { findBalancesByWallet } from '../../../src/modules/balances/balances.repository';
import { recordDeposit, recordWithdrawal } from '../../../src/modules/transactions/transactions.ledger';
import { findWalletByUserId } from '../../../src/modules/wallets/wallets.repository';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

async function createFundedWallet(amount: string): Promise<string> {
  const user = await registerTestUser();
  const wallet = await findWalletByUserId(user.userId);
  if (!wallet) {
    throw new Error('Wallet not found for freshly registered test user');
  }
  await withTransaction((client) => recordDeposit(client, wallet.id, 'USD', amount));
  return wallet.id;
}

// Automatiza la prueba de concurrencia que se hizo a mano en el Sprint 1: la protección real no es
// un lock explícito, es la condición `WHERE amount >= $1` del UPDATE en `withdrawBalance` — cada
// retiro concurrente corre en su propia conexión/transacción de Postgres, y solo los que todavía
// alcanzan fondos en el momento exacto del UPDATE pasan.
describe('withdrawal concurrency (no negative balance, no lost updates)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('allows exactly as many concurrent withdrawals as the balance supports', async () => {
    const walletId = await createFundedWallet('100.00');

    // 3 retiros de $40 sobre $100: solo 2 pueden completarse (2*40=80<=100), el tercero pediría
    // $120 en total y tiene que fallar limpio, sin dejar el balance en negativo.
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        withTransaction((client) => recordWithdrawal(client, walletId, 'USD', '40.00')),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(1);

    const balances = await findBalancesByWallet(walletId);
    const usdBalance = Number(balances.find((b) => b.currency === 'USD')!.amount);

    expect(usdBalance).toBe(20);
    expect(usdBalance).toBeGreaterThanOrEqual(0);
  });

  it('never lets the balance go negative under heavier concurrency', async () => {
    const walletId = await createFundedWallet('100.00');

    // 10 retiros de $15 sobre $100: caben 6 (6*15=90<=100), el 7mo ya pediría 105 y tiene que
    // fallar; ninguno debería dejar el balance negativo aunque corran todos a la vez.
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        withTransaction((client) => recordWithdrawal(client, walletId, 'USD', '15.00')),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');

    expect(fulfilled).toHaveLength(6);

    const balances = await findBalancesByWallet(walletId);
    const usdBalance = Number(balances.find((b) => b.currency === 'USD')!.amount);

    expect(usdBalance).toBe(10);
    expect(usdBalance).toBeGreaterThanOrEqual(0);
  });
});
