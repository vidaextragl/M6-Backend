import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import {
  depositController,
  getCurrenciesController,
  getWalletController,
  withdrawController,
} from './wallets.controller';
import { depositWithdrawSchema } from './wallets.validation';

export const walletRoutes = Router();

walletRoutes.get('/', authMiddleware, getWalletController);
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

export const currenciesRoutes = Router();
currenciesRoutes.get('/', getCurrenciesController);
