import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser, type TestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

async function seedTransactions(user: TestUser): Promise<void> {
  await request(app)
    .post('/wallet/deposit')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ currency: 'USD', amount: '100.00' })
    .expect(201);

  await request(app)
    .post('/wallet/deposit')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ currency: 'EUR', amount: '50.00' })
    .expect(201);

  await request(app)
    .post('/wallet/withdraw')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ currency: 'USD', amount: '20.00' })
    .expect(201);
}

describe('GET /transactions', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('lists all transactions ordered from newest to oldest', async () => {
    const user = await registerTestUser();
    await seedTransactions(user);

    const res = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.total).toBe(3);
    expect(res.body.transactions).toHaveLength(3);
    expect(res.body.transactions[0].type).toBe('WITHDRAWAL');
    const timestamps = res.body.transactions.map((t: { createdAt: string }) =>
      new Date(t.createdAt).getTime(),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it('filters by transaction type', async () => {
    const user = await registerTestUser();
    await seedTransactions(user);

    const res = await request(app)
      .get('/transactions')
      .query({ type: 'DEPOSIT' })
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.transactions.every((t: { type: string }) => t.type === 'DEPOSIT')).toBe(true);
  });

  it('filters by currency', async () => {
    const user = await registerTestUser();
    await seedTransactions(user);

    const res = await request(app)
      .get('/transactions')
      .query({ currency: 'EUR' })
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.total).toBe(1);
  });

  it('paginates with limit and offset', async () => {
    const user = await registerTestUser();
    await seedTransactions(user);

    const res = await request(app)
      .get('/transactions')
      .query({ limit: 1, offset: 1 })
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.total).toBe(3);
  });

  it('rejects a calendar-invalid date', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .get('/transactions')
      .query({ from: '2026-02-30' })
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects when "from" is after "to"', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .get('/transactions')
      .query({ from: '2026-01-02', to: '2026-01-01' })
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app).get('/transactions').expect(401);
  });
});
