import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

// Mismo escenario que `transactions/concurrency.test.ts`, pero disparado por HTTP real en vez de
// llamando al ledger directo — prueba la cadena completa (ruta -> controller -> service -> ledger).
describe('POST /wallet/withdraw concurrency', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('allows only as many concurrent withdrawals as the balance actually supports', async () => {
    const user = await registerTestUser();
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        request(app)
          .post('/wallet/withdraw')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ currency: 'USD', amount: '40.00' }),
      ),
    );

    const statuses = results.map((r) => (r.status === 'fulfilled' ? r.value.status : 'error'));
    const succeeded = statuses.filter((s) => s === 201);
    const failed = statuses.filter((s) => s === 422);

    expect(succeeded).toHaveLength(2);
    expect(failed).toHaveLength(1);

    const wallet = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    const usdBalance = Number(
      wallet.body.wallet.balances.find((b: { currency: string }) => b.currency === 'USD').amount,
    );
    expect(usdBalance).toBe(20);
    expect(usdBalance).toBeGreaterThanOrEqual(0);
  });
});
