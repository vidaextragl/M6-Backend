import { ApiError } from '@google/genai';
import type { Content, FunctionCall, GenerateContentParameters } from '@google/genai';

import { AppError } from '../../shared/errors';
import { genAI, GEMINI_MODEL } from './chatbot.client';
import { CHATBOT_FUNCTION_DECLARATIONS, dispatchFunctionCall } from './chatbot.functions';
import { sanitizeUserMessage, SYSTEM_PROMPT } from './chatbot.prompt';

// Tope de idas y vueltas modelo <-> funciones para una misma pregunta. Ninguna de las 4 funciones
// disponibles depende de otra, así que en la práctica esto corta en la primera o segunda vuelta;
// el límite solo evita un loop infinito si el modelo insistiera en llamar funciones sin parar.
const MAX_FUNCTION_CALL_ROUNDS = 4;

const FALLBACK_REPLY =
  'No pude generar una respuesta en este momento. Probá de nuevo en unos segundos.';

// Gemini devuelve 503 "high demand" con bastante frecuencia (es un problema conocido y recurrente
// del lado de Google, no algo puntual de este proyecto) cuando el modelo está saturado — es un
// error transitorio, no algo que dependa de lo que mandamos. Se reintenta con backoff exponencial
// (500ms, 1s, 2s) antes de darlo por caído; cualquier otro status (400 de validación, etc.) se
// relanza directo porque reintentarlo no cambiaría el resultado.
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(params: GenerateContentParameters) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (error) {
      const isRetryable = error instanceof ApiError && error.status === 503;
      if (!isRetryable || attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

async function runFunctionCalls(
  userId: string,
  functionCalls: FunctionCall[],
): Promise<Content> {
  const parts = await Promise.all(
    functionCalls.map(async (call) => {
      const name = call.name ?? '';
      const args = call.args ?? {};
      const result = await dispatchFunctionCall(userId, name, args);

      return {
        functionResponse: {
          id: call.id,
          name,
          response: result,
        },
      };
    }),
  );

  return { role: 'user', parts };
}

export async function sendChatMessage(userId: string, rawMessage: string): Promise<string> {
  const message = sanitizeUserMessage(rawMessage);

  const contents: Content[] = [{ role: 'user', parts: [{ text: message }] }];

  for (let round = 0; round < MAX_FUNCTION_CALL_ROUNDS; round++) {
    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: CHATBOT_FUNCTION_DECLARATIONS }],
      },
    });

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      return response.text ?? FALLBACK_REPLY;
    }

    // Se reusa el `content` tal como lo devolvió el modelo (no se reconstruye a mano a partir de
    // `functionCalls`) porque Gemini 3 adjunta un `thoughtSignature` por parte que hay que
    // devolverle intacto en el siguiente turno — si se arma el `Part` de cero se pierde ese campo
    // y la API rechaza la llamada siguiente con "missing thought_signature".
    const modelContent = response.candidates?.[0]?.content ?? {
      role: 'model',
      parts: functionCalls.map((call) => ({ functionCall: call })),
    };

    contents.push(modelContent);
    contents.push(await runFunctionCalls(userId, functionCalls));
  }

  throw new AppError(502, 'Chatbot could not resolve a response', 'CHATBOT_TOO_MANY_FUNCTION_CALLS');
}
