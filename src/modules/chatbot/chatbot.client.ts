import { GoogleGenAI } from '@google/genai';

import { env } from '../../config';

export const GEMINI_MODEL = 'gemini-3.6-flash';

export const genAI = new GoogleGenAI({ apiKey: env.geminiApiKey });
