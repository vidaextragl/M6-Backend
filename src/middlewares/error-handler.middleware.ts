import type { NextFunction, Request, Response } from 'express';

export function errorHandlerMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
