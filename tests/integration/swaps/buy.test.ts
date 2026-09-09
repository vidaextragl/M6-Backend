import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Mockeado a nivel de servicio (no del provider HTTP): así se evita depender de la caché en
// memoria de `exchange-rates.cache.ts` y de red real, y alcanza tanto a quien importa este módulo
// directo (`cashback.limits.ts`) como a quien lo importa vía el barrel `../exchange-rates`
// (`swaps.guard.ts`), porque ambos resuelven al mismo archivo.
vi.mock('../../../src/modules/exchange-rates/exchange-rates.service', () => ({
  getExchangeRate: vi.fn(async (from: string, to: string) => {
    const rates: Record<string, number> = { EUR_USD: 1.1, USD_EUR: 1 / 1.1 };
    return {
      from,
      to,
      rate: rates[`${from}_${to}`] ?? 1,
      provider: 'mock',
      fetchedAt: new Date(),
      source: 'live' as const,
    };
  }),
}));

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

describe('POST /exchange/buy', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('records the purchase, the cashback, and the reward points atomically', async () => {
    const user = await registerTestUser();

    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '500.00' })
      .expect(201);

    const res = await request(app)
      .post('/exchange/buy')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '200.00' })
      .expect(201);

    expect(res.body.purchase).toMatchObject({ type: 'BUY', fromCurrency: 'USD', amountSent: '200.00', status: 'COMPLETED' });
    expect(res.body.cashback.transaction).toMatchObject({ type: 'REWARD_CASHBACK', toCurrency: 'USD', amountReceived: '10.00' });
    expect(res.body.balance).toEqual({ currency: 'USD', amount: '310.00' });

    const rewards = await request(app)
      .get('/rewards')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(rewards.body.pointsBalance).toBe(1000);
  });

  it('fails with insufficient funds and creates nothing at all (atomicity)', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/exchange/buy')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '50.00' })
      .expect(422);

    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');

    const transactions = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(transactions.body.total).toBe(0);

    const wallet = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(wallet.body.wallet.balances.find((b: { currency: string }) => b.currency === 'USD').amount).toBe(
      '0.00',
    );
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/exchange/buy')
      .send({ currency: 'USD', amount: '50.00' })
      .expect(401);
  });

  describe('cashback limits', () => {
    it('caps cashback at the $10 USD-equivalent per-transaction limit', async () => {
      const user = await registerTestUser();

      await request(app)
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'EUR', amount: '2000.00' })
        .expect(201);

      // 1000 EUR * 5% = 50 EUR de cashback "crudo" = 55 USD (a 1.1) -> tope de $10 USD ->
      // recortado a 9.09 EUR (10 / 1.1).
      const res = await request(app)
        .post('/exchange/buy')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'EUR', amount: '1000.00' })
        .expect(201);

      expect(res.body.cashback.amount).toBe('9.09');
      expect(res.body.cashback.points).toBe(909);
    });

    it('does not cap cashback under the per-transaction limit', async () => {
      const user = await registerTestUser();

      await request(app)
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'USD', amount: '200.00' })
        .expect(201);

      const res = await request(app)
        .post('/exchange/buy')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'USD', amount: '50.00' })
        .expect(201);

      expect(res.body.cashback.amount).toBe('2.50');
      expect(res.body.cashback.points).toBe(250);
    });

    it('closes the $100 weekly cap exactly, capping the boundary purchase and zeroing the next one', async () => {
      const user = await registerTestUser();

      await request(app)
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'USD', amount: '10000.00' })
        .expect(201);

      // Compra chica primero (cashback $2.50, sin recortar) para que el total semanal no cierre en
      // un múltiplo redondo de $10 — así el recorte parcial del límite queda expuesto de verdad,
      // en vez de que cada compra grande caiga siempre justo en el tope.
      const warmup = await request(app)
        .post('/exchange/buy')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'USD', amount: '50.00' })
        .expect(201);
      expect(warmup.body.cashback.amount).toBe('2.50');

      const cashbackAmounts: string[] = [];
      for (let i = 0; i < 10; i++) {
        // Las compras van en secuencia (no Promise.all): cada una depende del cashback semanal ya
        // acumulado por las anteriores.
        const res = await request(app)
          .post('/exchange/buy')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ currency: 'USD', amount: '500.00' })
          .expect(201);
        cashbackAmounts.push(res.body.cashback.amount as string);
      }

      // $2.50 (warmup) + 9x$10.00 (tope por transacción) = $92.50, quedan $7.50 -> la 10ma compra
      // de la serie se recorta a ese remanente exacto, y no hay una 11va compra en este test.
      expect(cashbackAmounts).toEqual([
        '10.00', '10.00', '10.00', '10.00', '10.00', '10.00', '10.00', '10.00', '10.00', '7.50',
      ]);

      const summary = await request(app)
        .get('/cashback/summary')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      expect(summary.body.available).toBe(100);
      expect(summary.body.monthlyEarned).toBe(100);

      // Con el tope ya agotado en $100 exactos, cualquier compra siguiente da cashback $0.
      const zeroed = await request(app)
        .post('/exchange/buy')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ currency: 'USD', amount: '500.00' })
        .expect(201);
      expect(zeroed.body.cashback.amount).toBe('0.00');
    });
  });
});
