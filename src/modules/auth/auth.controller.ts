import type { Request, Response } from 'express';

import * as authService from './auth.service';

export async function registerController(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}

export function meController(req: Request, res: Response): void {
  res.status(200).json({ user: req.user });
}
