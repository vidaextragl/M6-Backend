import { Router } from 'express';

import { validateQuery } from '../../middlewares';
import { getExchangeRateController } from './exchange-rates.controller';
import { getExchangeRateQuerySchema } from './exchange-rates.validation';

export const exchangeRatesRoutes = Router();

exchangeRatesRoutes.get('/', validateQuery(getExchangeRateQuerySchema), getExchangeRateController);
