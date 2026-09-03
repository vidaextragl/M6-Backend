import { z } from 'zod';

export const redeemSchema = z.object({
  catalogItemId: z.uuid(),
});
