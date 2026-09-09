import { afterAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { env } from '../../../src/config';
import { app } from '../../../src/app';
import { pool } from '../../../src/database';

describe('authMiddleware (protected routes)', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/wallet').expect(401);

    expect(res.body.code).toBe('MISSING_TOKEN');
  });

  it('rejects a malformed/invalid token', async () => {
    const res = await request(app)
      .get('/wallet')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);

    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: '00000000-0000-0000-0000-000000000000', exp: Math.floor(Date.now() / 1000) - 10 },
      env.jwtSecret,
    );

    const res = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });
});
