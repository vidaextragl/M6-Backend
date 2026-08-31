import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../../config';
import { UnauthorizedError } from '../../shared/errors';
import type { JwtPayload } from './auth.types';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing authentication token');
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = jwt.verify(token, env.jwtSecret) as JwtPayload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
