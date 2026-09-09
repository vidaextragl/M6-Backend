import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser, type TestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

afterAll(async () => {
  await pool.end();
});

async function findCatalogItemByName(user: TestUser, name: string) {
  const res = await request(app)
    .get('/rewards')
    .set('Authorization', `Bearer ${user.token}`)
    .expect(200);
  const item = res.body.catalog.find((i: { name: string }) => i.name === name);
  if (!item) {
    throw new Error(`Catalog item "${name}" not found`);
  }
  return item as { id: string; name: string; costPoints: number };
}

// $200 * 5% = $10 de cashback (justo en el tope por transacción) -> 1000 puntos, suficiente para
// canjear cualquier ítem del catálogo sembrado en la migración 0009.
async function earnPoints(user: TestUser, amount = '200.00'): Promise<void> {
  await request(app)
    .post('/wallet/deposit')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ currency: 'USD', amount: '1000.00' })
    .expect(201);
  await request(app)
    .post('/exchange/buy')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ currency: 'USD', amount })
    .expect(201);
}

describe('GET /rewards', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns the seeded catalog and a zero points balance for a fresh user', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .get('/rewards')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.pointsBalance).toBe(0);
    expect(res.body.catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Pase de batalla', costPoints: 500 }),
        expect.objectContaining({ name: 'Skin exclusiva', costPoints: 800 }),
        expect.objectContaining({ name: 'Cupón 10% OFF', costPoints: 200 }),
      ]),
    );
  });
});

describe('POST /rewards/redeem', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('redeems a reward, debiting points', async () => {
    const user = await registerTestUser();
    await earnPoints(user);
    const item = await findCatalogItemByName(user, 'Cupón 10% OFF');

    const res = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ catalogItemId: item.id })
      .expect(201);

    expect(res.body.points).toBe(-200);
    expect(res.body.source).toBe('REDEMPTION');

    const rewards = await request(app)
      .get('/rewards')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(rewards.body.pointsBalance).toBe(800);
  });

  it('rejects a redemption with insufficient points', async () => {
    const user = await registerTestUser();
    const item = await findCatalogItemByName(user, 'Cupón 10% OFF');

    const res = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ catalogItemId: item.id })
      .expect(422);

    expect(res.body.code).toBe('INSUFFICIENT_POINTS');
  });

  it('rejects a nonexistent catalog item', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ catalogItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
      .expect(404);

    expect(res.body.code).toBe('REWARD_NOT_FOUND');
  });

  it('rejects a malformed catalogItemId', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ catalogItemId: 'not-a-uuid' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('allows only as many concurrent redemptions as the points balance supports', async () => {
    const user = await registerTestUser();
    await earnPoints(user); // 1000 puntos
    const item = await findCatalogItemByName(user, 'Pase de batalla'); // cuesta 500

    // 3 canjes concurrentes de 500 puntos sobre un balance de 1000: solo 2 alcanzan.
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        request(app)
          .post('/rewards/redeem')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ catalogItemId: item.id }),
      ),
    );

    const statuses = results.map((r) => (r.status === 'fulfilled' ? r.value.status : 'error'));
    expect(statuses.filter((s) => s === 201)).toHaveLength(2);
    expect(statuses.filter((s) => s === 422)).toHaveLength(1);

    const rewards = await request(app)
      .get('/rewards')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(rewards.body.pointsBalance).toBe(0);
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/rewards/redeem')
      .send({ catalogItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
      .expect(401);
  });
});

describe('GET /cashback', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lists only REWARD_CASHBACK transactions', async () => {
    const user = await registerTestUser();
    await earnPoints(user); // deposita $1000 y compra $200 -> 1 transacción BUY + 1 REWARD_CASHBACK

    const res = await request(app)
      .get('/cashback')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0]).toMatchObject({ type: 'REWARD_CASHBACK', amountReceived: '10.00' });
  });

  it('returns an empty history for a user with no cashback yet', async () => {
    const user = await registerTestUser();

    const res = await request(app)
      .get('/cashback')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.total).toBe(0);
    expect(res.body.history).toEqual([]);
  });

  it('requires authentication', async () => {
    await request(app).get('/cashback').expect(401);
  });
});
