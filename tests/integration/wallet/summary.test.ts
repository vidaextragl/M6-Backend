import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { getExchangeRate } = vi.hoisted(() => ({ getExchangeRate: vi.fn() }));

vi.mock('../../../src/modules/exchange-rates/exchange-rates.service', () => ({ getExchangeRate }));

import { ExchangeRateUnavailableError } from '../../../src/shared/errors';
import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function setTransactionCreatedAt(transactionId: string, createdAt: Date): Promise<void> {
  await pool.query('UPDATE transactions SET created_at = $1 WHERE id = $2', [
    createdAt,
    transactionId,
  ]);
}

describe('GET /wallet/summary and GET /cashback/summary', () => {
  beforeEach(async () => {
    await resetDb();
    getExchangeRate.mockReset();
    getExchangeRate.mockImplementation(async (from: string, to: string) => ({
      from,
      to,
      rate: 1,
      provider: 'mock',
      fetchedAt: new Date(),
      source: 'live' as const,
    }));
  });

  afterAll(async () => {
    await pool.end();
  });

  it('reconstructs totalBalance, monthlyChangePercentage and 7-day history from the ledger', async () => {
    const user = await registerTestUser();

    // Mismo escenario verificado a mano en el Sprint 2: 3 depósitos reales, los dos primeros
    // reubicados a 40 y 15 días atrás; el de $200 queda "de hoy".
    const deposit1 = await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '1000.00' })
      .expect(201);
    const deposit2 = await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '500.00' })
      .expect(201);
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '200.00' })
      .expect(201);

    await setTransactionCreatedAt(deposit1.body.transaction.id, daysAgo(40));
    await setTransactionCreatedAt(deposit2.body.transaction.id, daysAgo(15));

    const res = await request(app)
      .get('/wallet/summary')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.totalBalance).toBe(1700);
    // (1700 - 1000) / 1000 * 100 = 70% -> el depósito de hace 40 días ya estaba hace 30 días, los
    // otros dos ($500 + $200 = $700) todavía no habían pasado.
    expect(res.body.monthlyChangePercentage).toBe(70);

    const usdCurrency = res.body.currencies.find((c: { code: string }) => c.code === 'USD');
    // (1700 - 1500) / 1500 * 100 = 13.33% -> hace 7 días solo faltaba el depósito de hoy ($200).
    expect(usdCurrency.changePercentage).toBe(13.33);

    expect(res.body.balanceHistory.map((day: { value: number }) => day.value)).toEqual([
      1500, 1500, 1500, 1500, 1500, 1500, 1700,
    ]);
  });

  it('reflects cashback earned this month in GET /cashback/summary', async () => {
    const user = await registerTestUser();
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '500.00' })
      .expect(201);

    // $200 * 5% = $10 de cashback, bien debajo del tope de $10/transacción.
    await request(app)
      .post('/exchange/buy')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '200.00' })
      .expect(201);

    const res = await request(app)
      .get('/cashback/summary')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.available).toBe(10);
    expect(res.body.monthlyEarned).toBe(10);
    expect(res.body.monthlyGoal).toBe(100);
    expect(res.body.progressPercentage).toBe(10);
  });

  it('excludes a currency from totalBalance instead of crashing when no rate is available', async () => {
    const user = await registerTestUser();
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '1000.00' })
      .expect(201);
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'EUR', amount: '500.00' })
      .expect(201);

    getExchangeRate.mockImplementation(async (from: string, to: string) => {
      if (from === 'EUR') {
        throw new ExchangeRateUnavailableError();
      }
      return { from, to, rate: 1, provider: 'mock', fetchedAt: new Date(), source: 'live' as const };
    });

    const res = await request(app)
      .get('/wallet/summary')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    // El EUR se muestra igual en `currencies` (no depende de conversión), pero no suma al total en
    // USD porque no hay forma de convertirlo — el dashboard entero no debe romperse por eso.
    expect(res.body.totalBalance).toBe(1000);
    const eurCurrency = res.body.currencies.find((c: { code: string }) => c.code === 'EUR');
    expect(eurCurrency.balance).toBe(500);
  });

  it('requires authentication', async () => {
    await request(app).get('/wallet/summary').expect(401);
  });
});
