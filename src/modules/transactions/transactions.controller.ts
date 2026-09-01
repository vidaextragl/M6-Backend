import type { Request, Response } from 'express';

import * as transactionsService from './transactions.service';
import type { ListTransactionsFilters } from './transactions.types';

export async function listTransactionsController(req: Request, res: Response): Promise<void> {
  const filters = req.validatedQuery as ListTransactionsFilters;
  const result = await transactionsService.listTransactions(req.user!.userId, filters);
  res.status(200).json(result);
}
