import { describe, expect, it } from 'vitest';

import { redeemSchema } from '../../../src/modules/rewards/rewards.validation';

describe('redeemSchema', () => {
  it('accepts a valid UUID', () => {
    expect(redeemSchema.safeParse({ catalogItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }).success).toBe(
      true,
    );
  });

  it('rejects a non-UUID string', () => {
    expect(redeemSchema.safeParse({ catalogItemId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects a missing catalogItemId', () => {
    expect(redeemSchema.safeParse({}).success).toBe(false);
  });
});
