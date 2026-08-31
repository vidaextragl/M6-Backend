import cors from 'cors';
import express from 'express';

import { errorHandlerMiddleware } from './middlewares';
import { authRoutes } from './modules/auth';
import { usersRoutes } from './modules/users';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandlerMiddleware);
