import { toBalanceResponse } from '../balances/balances.service';
import { findBalancesByWallet } from '../balances/balances.repository';
import { withTransaction } from '../../database';
import { AppError, NotFoundError } from '../../shared/errors';
// Imports directos (no a los barrels '../notifications', '../users'): mismo cuidado de ciclo que
// en el resto del proyecto, aunque hoy ninguno de los dos dependa de rutas con authMiddleware.
import { sendTransactionReceiptEmail } from '../notifications/email/receipts.service';
import { findUserByEmail } from '../users/users.repository';
import { recordDeposit, recordTransfer, recordWithdrawal } from '../transactions/transactions.ledger';
import { toTransactionResponse } from '../transactions/transactions.service';
import { findWalletByUserId } from './wallets.repository';
import { computeWalletSummary } from './wallets.summary';

async function getWalletOrThrow(userId: string) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }
  return wallet;
}

export async function getWallet(userId: string) {
  const wallet = await getWalletOrThrow(userId);
  const balances = await findBalancesByWallet(wallet.id);

  return {
    id: wallet.id,
    balances: balances.map(toBalanceResponse),
  };
}

export async function deposit(userId: string, currency: string, amount: string) {
  const wallet = await getWalletOrThrow(userId);

  const { transaction, balance } = await withTransaction((client) =>
    recordDeposit(client, wallet.id, currency, amount),
  );

  // No se espera el envío del email: es un efecto secundario y no debe demorar ni romper la
  // respuesta del depósito, que ya quedó confirmado en la base de datos.
  void sendTransactionReceiptEmail(userId, transaction);

  return { transaction: toTransactionResponse(transaction), balance: toBalanceResponse(balance) };
}

export async function withdraw(userId: string, currency: string, amount: string) {
  const wallet = await getWalletOrThrow(userId);

  const { transaction, balance } = await withTransaction((client) =>
    recordWithdrawal(client, wallet.id, currency, amount),
  );

  void sendTransactionReceiptEmail(userId, transaction);

  return { transaction: toTransactionResponse(transaction), balance: toBalanceResponse(balance) };
}

export async function transfer(
  userId: string,
  recipientEmail: string,
  currency: string,
  amount: string,
) {
  const senderWallet = await getWalletOrThrow(userId);

  const recipient = await findUserByEmail(recipientEmail);
  if (!recipient) {
    throw new NotFoundError('Recipient not found', 'RECIPIENT_NOT_FOUND');
  }
  if (recipient.id === userId) {
    throw new AppError(400, 'Cannot transfer to yourself', 'CANNOT_TRANSFER_TO_SELF');
  }

  // No se usa getWalletOrThrow acá: si el destinatario existe pero no tiene wallet, es un dato
  // corrupto (todo registro crea la wallet automáticamente), no un 404 esperable de negocio.
  const recipientWallet = await findWalletByUserId(recipient.id);
  if (!recipientWallet) {
    throw new NotFoundError('Recipient wallet not found', 'WALLET_NOT_FOUND');
  }

  const { senderTransaction, senderBalance, recipientTransaction } = await withTransaction((client) =>
    recordTransfer(client, senderWallet.id, recipientWallet.id, currency, amount),
  );

  void sendTransactionReceiptEmail(userId, senderTransaction);
  void sendTransactionReceiptEmail(recipient.id, recipientTransaction);

  return {
    transaction: toTransactionResponse(senderTransaction),
    balance: toBalanceResponse(senderBalance),
  };
}

export async function getWalletSummary(userId: string) {
  const wallet = await getWalletOrThrow(userId);
  const balances = await findBalancesByWallet(wallet.id);

  return computeWalletSummary(wallet.id, balances);
}
