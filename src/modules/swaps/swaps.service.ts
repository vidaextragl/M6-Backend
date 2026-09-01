import { withTransaction } from '../../database';
import { AppError, NotFoundError } from '../../shared/errors';
import { toBalanceResponse } from '../balances/balances.service';
import { recordSwap } from '../transactions/transactions.ledger';
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
  const amountSentNumber = Math.ceil((Number(amountToReceive) / rate) * 100) / 100;
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
