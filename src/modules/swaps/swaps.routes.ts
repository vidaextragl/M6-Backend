import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import { swapController } from './swaps.controller';
import { swapSchema } from './swaps.validation';

export const swapsRoutes = Router();

swapsRoutes.post('/swap', authMiddleware, validateSchema(swapSchema), swapController);
