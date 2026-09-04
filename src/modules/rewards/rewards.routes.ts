import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import { getCashbackController, getRewardsController, redeemController } from './rewards.controller';
import { redeemSchema } from './rewards.validation';

export const rewardsRoutes = Router();

rewardsRoutes.get('/', authMiddleware, getRewardsController);
rewardsRoutes.post('/redeem', authMiddleware, validateSchema(redeemSchema), redeemController);

export const cashbackRoutes = Router();

cashbackRoutes.get('/', authMiddleware, getCashbackController);
