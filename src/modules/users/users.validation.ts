import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    avatarUrl: z.string().url().optional(),
  })
  .refine((data) => data.name !== undefined || data.avatarUrl !== undefined, {
    message: 'At least one field (name or avatarUrl) must be provided',
  });
