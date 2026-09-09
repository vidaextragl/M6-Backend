import { afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../../src/modules/exchange-rates/exchange-rates.service', () => ({
  getExchangeRate: vi.fn(async (from: string, to: string) => ({
    from,
    to,
    rate: 1500,
    provider: 'mock',
    fetchedAt: new Date(),
    source: 'live' as const,
  })),
}));

import { app } from '../../../src/app';
import { pool } from '../../../src/database';

describe('GET /exchange-rates', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('returns the exchange rate for a valid currency pair', async () => {
    const res = await request(app).get('/exchange-rates').query({ from: 'USD', to: 'ARS' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ from: 'USD', to: 'ARS', rate: 1500 });
  });

  it('rejects when from and to are the same currency', async () => {
    const res = await request(app).get('/exchange-rates').query({ from: 'USD', to: 'USD' });

    expect(res.status).toBe(400);
  });

  it('rejects an unsupported currency', async () => {
    const res = await request(app).get('/exchange-rates').query({ from: 'USD', to: 'XYZ' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing query param', async () => {
    const res = await request(app).get('/exchange-rates').query({ from: 'USD' });

    expect(res.status).toBe(400);
  });
});
