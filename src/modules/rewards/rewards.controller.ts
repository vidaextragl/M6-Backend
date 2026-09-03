import type { Request, Response } from 'express';

import * as rewardsService from './rewards.service';

export async function getRewardsController(req: Request, res: Response): Promise<void> {
  const result = await rewardsService.getRewardsSummary(req.user!.userId);
  res.status(200).json(result);
}

export async function getCashbackController(req: Request, res: Response): Promise<void> {
  const result = await rewardsService.getCashbackSummary(req.user!.userId);
  res.status(200).json(result);
}

export async function redeemController(req: Request, res: Response): Promise<void> {
  const { catalogItemId } = req.body;
  const result = await rewardsService.redeemReward(req.user!.userId, catalogItemId);
  res.status(201).json(result);
}
