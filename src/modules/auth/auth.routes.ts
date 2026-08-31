import { Router } from 'express';

import { validateSchema } from '../../middlewares';
import { loginController, registerController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.validation';

export const authRoutes = Router();

authRoutes.post('/register', validateSchema(registerSchema), registerController);
authRoutes.post('/login', validateSchema(loginSchema), loginController);
