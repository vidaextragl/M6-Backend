import type { Request, Response } from 'express';

import * as usersService from './users.service';

export async function getMeController(req: Request, res: Response): Promise<void> {
  const user = await usersService.getProfile(req.user!.userId);
  res.status(200).json({ user });
}

export async function updateMeController(req: Request, res: Response): Promise<void> {
  const user = await usersService.updateProfile(req.user!.userId, req.body);
  res.status(200).json({ user });
}
