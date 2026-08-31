import type { PoolClient } from 'pg';

import { pool } from '../../database';
import type { UpdateUserFields, UserRecord } from './users.types';

export async function createUser(
  client: PoolClient,
  email: string,
  name: string,
  passwordHash: string,
): Promise<UserRecord> {
  const result = await client.query<UserRecord>(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [email, name, passwordHash],
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function updateUser(id: string, updates: UpdateUserFields): Promise<UserRecord> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(updates.name);
  }

  if (updates.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${index++}`);
    values.push(updates.avatarUrl);
  }

  values.push(id);

  const result = await pool.query<UserRecord>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    values,
  );
  return result.rows[0];
}
