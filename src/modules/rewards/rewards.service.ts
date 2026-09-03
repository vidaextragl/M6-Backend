import { withTransaction } from '../../database';
import { InsufficientPointsError, NotFoundError } from '../../shared/errors';
// Imports directos (no al barrel '../transactions', '../wallets'): esos barrels re-exportan
// rutas que dependen de authMiddleware, mismo cuidado de ciclo que en auth.service.ts.
import { findTransactionsByWallet } from '../transactions/transactions.repository';
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
