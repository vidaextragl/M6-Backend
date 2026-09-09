import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from '../../../src/modules/auth/auth.validation';

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Test User',
      password: 'Abcdefg1!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      name: 'Test User',
      password: 'Abcdefg1!',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: '',
      password: 'Abcdefg1!',
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ['too short', 'Ab1!'],
    ['no uppercase', 'abcdefg1!'],
    ['no number', 'Abcdefgh!'],
    ['no special character', 'Abcdefgh1'],
  ])('rejects a password that is %s', (_label, password) => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Test User',
      password,
    });

    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'anything' });

    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });

    expect(result.success).toBe(false);
  });
});
