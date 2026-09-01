import { withTransaction } from '../../database';
import { NotFoundError } from '../../shared/errors';
import { toBalanceResponse } from '../balances/balances.service';
import { recordSwap } from '../transactions/transactions.ledger';
import { toTransactionResponse } from '../transactions/transactions.service';
import { findWalletByUserId } from '../wallets/wallets.repository';
import { ensureLiveRate } from './swaps.guard';

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

  const { rate } = await ensureLiveRate(fromCurrency, toCurrency);
  const amountSent = (Number(amountToReceive) / rate).toFixed(2);

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
