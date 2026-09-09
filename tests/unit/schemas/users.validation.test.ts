import { describe, expect, it } from 'vitest';

import { updateProfileSchema } from '../../../src/modules/users/users.validation';

describe('updateProfileSchema', () => {
  it('accepts updating only the name', () => {
    expect(updateProfileSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('accepts updating only the avatarUrl', () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: 'https://example.com/a.png' }).success).toBe(true);
  });

  it('rejects an empty payload (at least one field required)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid URL for avatarUrl', () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(updateProfileSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
