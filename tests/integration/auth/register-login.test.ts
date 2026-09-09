import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { resetDb } from '../../helpers/db';

afterAll(async () => {
  await pool.end();
});

describe('POST /auth/register', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('registers a user and creates a wallet with all balances at zero', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new-user@example.com', name: 'New User', password: 'Abcdefg1!' })
      .expect(201);

    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ email: 'new-user@example.com', name: 'New User' });

    const wallet = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${res.body.token}`)
      .expect(200);
    expect(wallet.body.wallet.balances).toHaveLength(6);
    expect(wallet.body.wallet.balances.every((b: { amount: string }) => b.amount === '0.00')).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', name: 'First', password: 'Abcdefg1!' })
      .expect(201);

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', name: 'Second', password: 'Abcdefg1!' })
      .expect(409);

    expect(res.body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await resetDb();
    await request(app)
      .post('/auth/register')
      .send({ email: 'login-user@example.com', name: 'Login User', password: 'Abcdefg1!' })
      .expect(201);
  });

  it('logs in with the correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login-user@example.com', password: 'Abcdefg1!' })
      .expect(200);

    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe('login-user@example.com');
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login-user@example.com', password: 'WrongPassword1!' })
      .expect(401);

    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'Abcdefg1!' })
      .expect(401);

    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});
