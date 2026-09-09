import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

describe('POST /wallet/deposit and POST /wallet/withdraw', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deposits into the balance and records a DEPOSIT transaction', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    expect(res.body.transaction).toMatchObject({ type: 'DEPOSIT', amountReceived: '100.00' });
    expect(res.body.balance).toEqual({ currency: 'USD', amount: '100.00' });
  });

  it('withdraws from the balance and records a WITHDRAWAL transaction', async () => {
    const user = await registerTestUser();
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    const res = await request(app)
      .post('/wallet/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '30.00' })
      .expect(201);

    expect(res.body.transaction).toMatchObject({ type: 'WITHDRAWAL', amountSent: '30.00' });
    expect(res.body.balance).toEqual({ currency: 'USD', amount: '70.00' });
  });

  it('rejects a withdrawal with insufficient funds and leaves the balance untouched', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/wallet/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currency: 'USD', amount: '10.00' })
      .expect(422);
    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');

    const wallet = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(wallet.body.wallet.balances.find((b: { currency: string }) => b.currency === 'USD').amount).toBe(
      '0.00',
    );
  });

  it.each([
    ['negative amount', { currency: 'USD', amount: '-10.00' }],
    ['zero amount', { currency: 'USD', amount: '0.00' }],
    ['more than 2 decimals', { currency: 'USD', amount: '10.123' }],
    ['unsupported currency', { currency: 'XYZ', amount: '10.00' }],
  ])('rejects a deposit with %s', async (_label, body) => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${user.token}`)
      .send(body)
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app).post('/wallet/deposit').send({ currency: 'USD', amount: '10.00' }).expect(401);
  });
});
