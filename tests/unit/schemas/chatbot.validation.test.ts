import { describe, expect, it } from 'vitest';

import { chatMessageSchema } from '../../../src/modules/chatbot/chatbot.validation';

describe('chatMessageSchema', () => {
  it('accepts a normal message', () => {
    expect(chatMessageSchema.safeParse({ message: '¿Cuánto saldo tengo?' }).success).toBe(true);
  });

  it('rejects an empty message', () => {
    expect(chatMessageSchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('rejects a message longer than 500 characters', () => {
    expect(chatMessageSchema.safeParse({ message: 'a'.repeat(501) }).success).toBe(false);
  });

  it('accepts a message exactly at the 500 character limit', () => {
    expect(chatMessageSchema.safeParse({ message: 'a'.repeat(500) }).success).toBe(true);
  });
});
