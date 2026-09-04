import { withTransaction } from '../../database';
import { getExchangeRate } from '../exchange-rates';
import { InsufficientPointsError, NotFoundError } from '../../shared/errors';
// Imports directos (no al barrel '../transactions', '../wallets'): esos barrels re-exportan
// rutas que dependen de authMiddleware, mismo cuidado de ciclo que en auth.service.ts.
import {
  findTransactionsByWallet,
  sumTransactionAmountsByCurrency,
} from '../transactions/transactions.repository';
import { toTransactionResponse } from '../transactions/transactions.service';
import { findWalletByUserId } from '../wallets/wallets.repository';
import {
  createRewardEntry,
  findCatalogItemById,
  findCatalogItems,
  getUserPointsBalance,
  getUserPointsBalanceInTransaction,
  lockUserForUpdate,
} from './rewards.repository';
import type { RewardCatalogItemRecord, RewardRecord } from './rewards.types';

const CASHBACK_HISTORY_LIMIT = 50;
// Meta mensual de cashback: número fijo, no sale de ninguna fórmula (igual que el mock original
// del frontend, que también lo tenía hardcodeado). Se puede volver configurable más adelante.
const MONTHLY_CASHBACK_GOAL_USD = 100;

async function sumByCurrencyToUsd(amountsByCurrency: Record<string, number>): Promise<number> {
  let total = 0;

  for (const [currency, amount] of Object.entries(amountsByCurrency)) {
    if (currency === 'USD') {
      total += amount;
      continue;
    }

    try {
      const { rate } = await getExchangeRate(currency, 'USD');
      total += amount * rate;
    } catch {
      // Si no hay ninguna cotización disponible para esa moneda, se la deja afuera del total en
      // vez de tirar abajo todo el resumen de cashback.
    }
  }

  return total;
}

export function toCatalogItemResponse(item: RewardCatalogItemRecord) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    costPoints: item.cost_points,
  };
}

export function toRewardResponse(reward: RewardRecord) {
  return {
    id: reward.id,
    points: reward.points,
    source: reward.source,
    description: reward.description,
    createdAt: reward.created_at.toISOString(),
  };
}

export async function getRewardsSummary(userId: string) {
  const [pointsBalance, catalog] = await Promise.all([
    getUserPointsBalance(userId),
    findCatalogItems(),
  ]);

  return {
    pointsBalance,
    catalog: catalog.map(toCatalogItemResponse),
  };
}

export async function getCashbackSummary(userId: string) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }

  const { transactions, total } = await findTransactionsByWallet(wallet.id, {
    type: 'REWARD_CASHBACK',
    limit: CASHBACK_HISTORY_LIMIT,
    offset: 0,
  });

  return {
    total,
    history: transactions.map(toTransactionResponse),
  };
}

export async function getCashbackDashboardSummary(userId: string) {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND');
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [allTimeByCurrency, thisMonthByCurrency] = await Promise.all([
    sumTransactionAmountsByCurrency(wallet.id, 'REWARD_CASHBACK'),
    sumTransactionAmountsByCurrency(wallet.id, 'REWARD_CASHBACK', startOfMonth),
  ]);

  const [available, monthlyEarned] = await Promise.all([
    sumByCurrencyToUsd(allTimeByCurrency),
    sumByCurrencyToUsd(thisMonthByCurrency),
  ]);

  return {
    available: Number(available.toFixed(2)),
    monthlyEarned: Number(monthlyEarned.toFixed(2)),
    monthlyGoal: MONTHLY_CASHBACK_GOAL_USD,
    progressPercentage: Math.min(100, Math.round((monthlyEarned / MONTHLY_CASHBACK_GOAL_USD) * 100)),
  };
}

export async function redeemReward(userId: string, catalogItemId: string) {
  const item = await findCatalogItemById(catalogItemId);
  if (!item) {
    throw new NotFoundError('Reward not found', 'REWARD_NOT_FOUND');
  }

  const reward = await withTransaction(async (client) => {
    await lockUserForUpdate(client, userId);

    const pointsBalance = await getUserPointsBalanceInTransaction(client, userId);
    if (pointsBalance < item.cost_points) {
      throw new InsufficientPointsError(`Insufficient points to redeem "${item.name}"`);
    }

    return createRewardEntry(client, {
      userId,
      points: -item.cost_points,
      source: 'REDEMPTION',
      catalogItemId: item.id,
      description: `Redeemed: ${item.name}`,
    });
  });

  return toRewardResponse(reward);
}
