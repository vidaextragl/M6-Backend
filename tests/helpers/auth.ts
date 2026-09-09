import request from 'supertest';

import { app } from '../../src/app';

export interface TestUser {
  token: string;
  userId: string;
  email: string;
}

let counter = 0;

export async function registerTestUser(
  overrides: Partial<{ email: string; name: string; password: string }> = {},
): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `test-user-${Date.now()}-${counter}@example.com`;
  const name = overrides.name ?? 'Test User';
  const password = overrides.password ?? 'Test1234!';

  const res = await request(app).post('/auth/register').send({ email, name, password });
  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token as string, userId: res.body.user.id as string, email };
}
