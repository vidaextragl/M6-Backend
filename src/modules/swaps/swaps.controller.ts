import type { Request, Response } from 'express';

import * as swapsService from './swaps.service';

export async function swapController(req: Request, res: Response): Promise<void> {
  const { fromCurrency, toCurrency, amountToReceive } = req.body;
  const result = await swapsService.swap(req.user!.userId, fromCurrency, toCurrency, amountToReceive);
  res.status(201).json(result);
}

export async function buyController(req: Request, res: Response): Promise<void> {
  const { currency, amount } = req.body;
  const result = await swapsService.buy(req.user!.userId, currency, amount);
  res.status(201).json(result);
}
