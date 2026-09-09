import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';

describe('GET /currencies', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('returns the 6 supported currencies without requiring authentication', async () => {
    const res = await request(app).get('/currencies');

    expect(res.status).toBe(200);
    expect(res.body.currencies).toEqual(['USD', 'EUR', 'ARS', 'CLP', 'COP', 'BRL']);
  });
});
