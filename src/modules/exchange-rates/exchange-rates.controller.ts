import type { Request, Response } from 'express';

import * as exchangeRatesService from './exchange-rates.service';

export async function getExchangeRateController(req: Request, res: Response): Promise<void> {
  const { from, to } = req.validatedQuery as { from: string; to: string };
  const result = await exchangeRatesService.getExchangeRate(from, to);
  res.status(200).json(result);
}
