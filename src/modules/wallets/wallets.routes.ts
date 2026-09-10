import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import {
  depositController,
  getCurrenciesController,
  getWalletController,
  getWalletSummaryController,
  transferController,
  withdrawController,
} from './wallets.controller';
import { depositWithdrawSchema, transferSchema } from './wallets.validation';

export const walletRoutes = Router();

walletRoutes.get('/', authMiddleware, getWalletController);
walletRoutes.get('/summary', authMiddleware, getWalletSummaryController);
walletRoutes.post(
  '/deposit',
  authMiddleware,
  validateSchema(depositWithdrawSchema),
  depositController,
);
walletRoutes.post(
  '/withdraw',
  authMiddleware,
  validateSchema(depositWithdrawSchema),
  withdrawController,
);
walletRoutes.post('/transfer', authMiddleware, validateSchema(transferSchema), transferController);

export const currenciesRoutes = Router();
currenciesRoutes.get('/', getCurrenciesController);
