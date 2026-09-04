export type RewardSource = 'CASHBACK' | 'REDEMPTION';

export interface RewardRecord {
  id: string;
  user_id: string;
  transaction_id: string | null;
  catalog_item_id: string | null;
  points: number;
  source: RewardSource;
  description: string | null;
  created_at: Date;
}

export interface RewardCatalogItemRecord {
  id: string;
  name: string;
  description: string | null;
  cost_points: number;
  created_at: Date;
}

export interface CreateRewardInput {
  userId: string;
  points: number;
  source: RewardSource;
  transactionId?: string;
  catalogItemId?: string;
  description?: string;
}
