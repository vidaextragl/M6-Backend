import type { Request, Response } from 'express';

import * as chatbotService from './chatbot.service';
import type { ChatRequest } from './chatbot.types';

export async function chatController(req: Request, res: Response): Promise<void> {
  const { message } = req.body as ChatRequest;
  const reply = await chatbotService.sendChatMessage(req.user!.userId, message);
  res.status(200).json({ reply });
}
