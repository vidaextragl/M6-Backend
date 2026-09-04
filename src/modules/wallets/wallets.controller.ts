import type { Request, Response } from 'express';

import { SUPPORTED_CURRENCIES } from '../../shared/constants';
import * as walletsService from './wallets.service';

export async function getWalletController(req: Request, res: Response): Promise<void> {
  const wallet = await walletsService.getWallet(req.user!.userId);
  res.status(200).json({ wallet });
}

export async function getWalletSummaryController(req: Request, res: Response): Promise<void> {
  const summary = await walletsService.getWalletSummary(req.user!.userId);
  res.status(200).json(summary);
}

export async function depositController(req: Request, res: Response): Promise<void> {
  const { currency, amount } = req.body;
  const result = await walletsService.deposit(req.user!.userId, currency, amount);
  res.status(201).json(result);
}

export async function withdrawController(req: Request, res: Response): Promise<void> {
  const { currency, amount } = req.body;
  const result = await walletsService.withdraw(req.user!.userId, currency, amount);
  res.status(201).json(result);
}

export function getCurrenciesController(_req: Request, res: Response): void {
  res.status(200).json({ currencies: SUPPORTED_CURRENCIES });
}
