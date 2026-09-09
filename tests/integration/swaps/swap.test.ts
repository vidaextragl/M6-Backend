import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { getExchangeRate } = vi.hoisted(() => ({ getExchangeRate: vi.fn() }));

vi.mock('../../../src/modules/exchange-rates/exchange-rates.service', () => ({ getExchangeRate }));

import { ExchangeRateUnavailableError } from '../../../src/shared/errors';
import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

function mockRate(rate: number) {
  getExchangeRate.mockResolvedValue({
    from: 'USD',
    to: 'ARS',
    rate,
    provider: 'mock',
    fetchedAt: new Date(),
    source: 'live' as const,
  });
}

describe('POST /exchange/swap', () => {
  beforeEach(async () => {
    await resetDb();
    getExchangeRate.mockReset();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('swaps between two balances and records the transaction', async () => {
    mockRate(1500);
    const user = await registerTestUser();

    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '500.00' })
      .expect(201);

    const res = await request(app)
      .post('/exchange/swap')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fromCurrency: 'USD', toCurrency: 'ARS', amountToReceive: '1500.00' })
      .expect(201);

    expect(res.body.transaction).toMatchObject({
      type: 'SWAP',
      fromCurrency: 'USD',
      toCurrency: 'ARS',
      amountSent: '1.00',
      amountReceived: '1500.00',
      status: 'COMPLETED',
    });
    expect(res.body.fromBalance).toEqual({ currency: 'USD', amount: '499.00' });
    expect(res.body.toBalance).toEqual({ currency: 'ARS', amount: '1500.00' });
  });

  it('rounds the debited amount up, never down (documented EPSILON case)', async () => {
    mockRate(1.992);
    const user = await registerTestUser();

    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    const res = await request(app)
      .post('/exchange/swap')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fromCurrency: 'USD', toCurrency: 'ARS', amountToReceive: '39.84' })
      .expect(201);

    // 39.84 / 1.992 da 20.000000000000004 en punto flotante puro; sin el EPSILON, el Math.ceil de
    // arriba cobraría 20.01 en vez de 20.00.
    expect(res.body.transaction.amountSent).toBe('20.00');
  });

  it('rejects when the receive amount is too small to convert to a chargeable amount', async () => {
    // Un rate absurdamente alto hace que amountToReceive/rate quede por debajo de la resolución de
    // centavos, y el guard de "AMOUNT_TOO_SMALL" es lo único que evita acreditar sin cobrar nada.
    mockRate(1e12);
    const user = await registerTestUser();

    const res = await request(app)
      .post('/exchange/swap')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fromCurrency: 'USD', toCurrency: 'ARS', amountToReceive: '0.01' })
      .expect(400);

    expect(res.body.code).toBe('AMOUNT_TOO_SMALL');
  });

  it('fails with insufficient funds in the source currency', async () => {
    mockRate(1500);
    const user = await registerTestUser();

    const res = await request(app)
      .post('/exchange/swap')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fromCurrency: 'USD', toCurrency: 'ARS', amountToReceive: '1500.00' })
      .expect(422);

    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('rejects swapping a currency into itself', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/exchange/swap')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fromCurrency: 'USD', toCurrency: 'USD', amountToReceive: '10.00' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('propagates a 503 when the exchange rate is unavailable (swap blocked)', async () => {
    getExchangeRate.mockRejectedValue(new ExchangeRateUnavailableError());
    const user = await registerTestUser();

    const res = await request(app)
      .post('/exchange/swap')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fromCurrency: 'USD', toCurrency: 'ARS', amountToReceive: '10.00' })
      .expect(503);

    expect(res.body.code).toBe('EXCHANGE_RATE_UNAVAILABLE');
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/exchange/swap')
      .send({ fromCurrency: 'USD', toCurrency: 'ARS', amountToReceive: '10.00' })
      .expect(401);
  });
});
