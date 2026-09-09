import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../src/app';
import { pool } from '../../src/database';

describe('health check and fallback routes', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
