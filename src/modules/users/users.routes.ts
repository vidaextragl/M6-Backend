import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import { getMeController, updateMeController } from './users.controller';
import { updateProfileSchema } from './users.validation';

export const usersRoutes = Router();

usersRoutes.get('/me', authMiddleware, getMeController);
usersRoutes.patch('/me', authMiddleware, validateSchema(updateProfileSchema), updateMeController);
