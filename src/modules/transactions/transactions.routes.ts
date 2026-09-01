import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateQuery } from '../../middlewares';
import { listTransactionsController } from './transactions.controller';
import { listTransactionsQuerySchema } from './transactions.validation';

export const transactionsRoutes = Router();

transactionsRoutes.get(
  '/',
  authMiddleware,
  validateQuery(listTransactionsQuerySchema),
  listTransactionsController,
);
