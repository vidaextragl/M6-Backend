import cors from 'cors';
import express from 'express';

import { errorHandlerMiddleware } from './middlewares';
import { authRoutes } from './modules/auth';
import { exchangeRatesRoutes } from './modules/exchange-rates';
import { swapsRoutes } from './modules/swaps';
import { usersRoutes } from './modules/users';
import { transactionsRoutes } from './modules/transactions';
import { currenciesRoutes, walletRoutes } from './modules/wallets';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/wallet', walletRoutes);
app.use('/currencies', currenciesRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/exchange-rates', exchangeRatesRoutes);
app.use('/exchange', swapsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandlerMiddleware);
