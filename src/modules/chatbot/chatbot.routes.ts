import { Router } from 'express';

import { authMiddleware } from '../auth';
import { validateSchema } from '../../middlewares';
import { chatController } from './chatbot.controller';
import { chatMessageSchema } from './chatbot.validation';

export const chatbotRoutes = Router();

chatbotRoutes.post('/', authMiddleware, validateSchema(chatMessageSchema), chatController);
