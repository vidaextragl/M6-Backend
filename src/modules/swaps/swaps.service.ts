import { withTransaction } from '../../database';
import { AppError, NotFoundError } from '../../shared/errors';
import { toBalanceResponse } from '../balances/balances.service';
// Import directo (no al barrel '../rewards'): rewards/index re-exporta rewards.routes, que
// importa authMiddleware de auth — mismo cuidado de ciclo que en el resto del proyecto.
import { calculateCashback } from '../rewards/cashback.calculator';
import { createRewardEntry } from '../rewards/rewards.repository';
import { recordBuy, recordCashback, recordSwap } from '../transactions/transactions.ledger';
import { toTransactionResponse } from '../transactions/transactions.service';
import { findWalletByUserId } from '../wallets/wallets.repository';
import { getUsableRate } from './swaps.guard';

export async function swap(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  amountToReceive: string,
) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }

  const { rate } = await getUsableRate(fromCurrency, toCurrency);

  // Redondeo hacia arriba (nunca hacia abajo): con toFixed/redondeo normal, pedir un monto chico en
  // una moneda "grande" (ej. recibir 6.99 ARS a ~1500 ARS/USD) puede resultar en un descuento de
  // "0.00" — y como el CHECK de balances es `amount >= 0`, un descuento de 0 nunca frena por fondos
  // insuficientes: se acredita la moneda destino sin cobrar nada, y es repetible sin límite.
  // El Math.ceil es lo que realmente cierra ese agujero (con rate>0 y amountToReceive>0 siempre da
  // >= 0.01); el guard de abajo es defensa en profundidad, no la protección real.
  // EPSILON: la división en `number` de JS puede dar ruido (39.84/1.992 = 20.000000000000004 en vez
  // de 20 exacto), y ese ruido empujaba el ceil a cobrar un centavo de más en divisiones que ya
  // eran exactas. Restarlo antes de redondear corrige eso sin reabrir el exploit de arriba.
  const EPSILON = 1e-9;
  const amountSentNumber = Math.ceil((Number(amountToReceive) / rate - EPSILON) * 100) / 100;
  if (amountSentNumber <= 0) {
    throw new AppError(400, 'The amount to receive is too small to convert', 'AMOUNT_TOO_SMALL');
  }
  const amountSent = amountSentNumber.toFixed(2);

  const { transaction, fromBalance, toBalance } = await withTransaction((client) =>
    recordSwap(client, wallet.id, fromCurrency, toCurrency, amountSent, amountToReceive, rate),
  );

  return {
    transaction: toTransactionResponse(transaction),
    fromBalance: toBalanceResponse(fromBalance),
    toBalance: toBalanceResponse(toBalance),
    rate,
  };
}

export async function buy(userId: string, currency: string, amount: string) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }

  const { cashbackAmount, points } = calculateCashback(amount);

  const result = await withTransaction(async (client) => {
    const purchase = await recordBuy(client, wallet.id, currency, amount);
    const cashback = await recordCashback(client, wallet.id, currency, cashbackAmount);
    const reward = await createRewardEntry(client, {
      userId,
      transactionId: cashback.transaction.id,
      points,
      source: 'CASHBACK',
      description: `Cashback from purchase of ${amount} ${currency}`,
    });

    return { purchase, cashback, reward };
  });

  return {
    purchase: toTransactionResponse(result.purchase.transaction),
    cashback: {
      transaction: toTransactionResponse(result.cashback.transaction),
      amount: cashbackAmount,
      points,
    },
    balance: toBalanceResponse(result.cashback.balance),
  };
}
