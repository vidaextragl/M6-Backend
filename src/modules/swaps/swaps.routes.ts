import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import { buyController, swapController } from './swaps.controller';
import { buySchema, swapSchema } from './swaps.validation';

export const swapsRoutes = Router();

swapsRoutes.post('/swap', authMiddleware, validateSchema(swapSchema), swapController);
swapsRoutes.post('/buy', authMiddleware, validateSchema(buySchema), buyController);
