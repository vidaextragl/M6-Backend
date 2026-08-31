import { Router } from 'express';

import { validateSchema } from '../../middlewares';
import { loginController, meController, registerController } from './auth.controller';
import { authMiddleware } from './auth.middleware';
import { loginSchema, registerSchema } from './auth.validation';

export const authRoutes = Router();

authRoutes.post('/register', validateSchema(registerSchema), registerController);
authRoutes.post('/login', validateSchema(loginSchema), loginController);
authRoutes.get('/me', authMiddleware, meController);
