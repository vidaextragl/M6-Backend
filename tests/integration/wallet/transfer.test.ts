import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../../../src/app';
import { pool } from '../../../src/database';
import { registerTestUser } from '../../helpers/auth';
import { resetDb } from '../../helpers/db';

afterAll(async () => {
  await pool.end();
});

describe('POST /wallet/transfer', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('debits the sender and credits the recipient, both as TRANSFER transactions', async () => {
    const sender = await registerTestUser({ email: 'sender@example.com' });
    const recipient = await registerTestUser({ email: 'recipient@example.com' });

    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    const res = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ recipientEmail: 'recipient@example.com', currency: 'USD', amount: '30.00' })
      .expect(201);

    expect(res.body.transaction).toMatchObject({
      type: 'TRANSFER',
      fromCurrency: 'USD',
      amountSent: '30.00',
      status: 'COMPLETED',
    });
    expect(res.body.balance).toEqual({ currency: 'USD', amount: '70.00' });

    const recipientWallet = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${recipient.token}`)
      .expect(200);
    expect(
      recipientWallet.body.wallet.balances.find((b: { currency: string }) => b.currency === 'USD')
        .amount,
    ).toBe('30.00');

    const recipientTransactions = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${recipient.token}`)
      .expect(200);
    expect(recipientTransactions.body.transactions[0]).toMatchObject({
      type: 'TRANSFER',
      toCurrency: 'USD',
      amountReceived: '30.00',
    });
  });

  it('fails with insufficient funds and does not touch either balance', async () => {
    const sender = await registerTestUser({ email: 'sender@example.com' });
    const recipient = await registerTestUser({ email: 'recipient@example.com' });

    const res = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ recipientEmail: 'recipient@example.com', currency: 'USD', amount: '10.00' })
      .expect(422);
    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');

    const recipientWallet = await request(app)
      .get('/wallet')
      .set('Authorization', `Bearer ${recipient.token}`)
      .expect(200);
    expect(
      recipientWallet.body.wallet.balances.find((b: { currency: string }) => b.currency === 'USD')
        .amount,
    ).toBe('0.00');
  });

  it('rejects a transfer to an email that is not a registered user', async () => {
    const sender = await registerTestUser({ email: 'sender@example.com' });
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    const res = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ recipientEmail: 'nobody@example.com', currency: 'USD', amount: '10.00' })
      .expect(404);
    expect(res.body.code).toBe('RECIPIENT_NOT_FOUND');
  });

  it('rejects transferring to yourself', async () => {
    const sender = await registerTestUser({ email: 'sender@example.com' });
    await request(app)
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ currency: 'USD', amount: '100.00' })
      .expect(201);

    const res = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ recipientEmail: 'sender@example.com', currency: 'USD', amount: '10.00' })
      .expect(400);
    expect(res.body.code).toBe('CANNOT_TRANSFER_TO_SELF');
  });

  it('rejects a malformed recipient email', async () => {
    const sender = await registerTestUser();

    const res = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ recipientEmail: 'not-an-email', currency: 'USD', amount: '10.00' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/wallet/transfer')
      .send({ recipientEmail: 'recipient@example.com', currency: 'USD', amount: '10.00' })
      .expect(401);
  });
});
