import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

afterAll(async () => {
  await pool.end();
});

describe('GET /users/me', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns the authenticated user's profile", async () => {
    const user = await registerTestUser({ email: 'me@example.com', name: 'Me' });

    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.user).toMatchObject({ email: 'me@example.com', name: 'Me' });
  });

  it('requires authentication', async () => {
    await request(app).get('/users/me').expect(401);
  });
});

describe('PATCH /users/me', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('updates the name', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.user.name).toBe('Updated Name');
  });

  it('updates the avatarUrl', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ avatarUrl: 'https://example.com/avatar.png' })
      .expect(200);

    expect(res.body.user.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('rejects an empty payload', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({})
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid avatarUrl', async () => {
    const user = await registerTestUser();

    await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ avatarUrl: 'not-a-url' })
      .expect(400);
  });
});
