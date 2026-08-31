import { NotFoundError } from '../../shared/errors';
import { findUserById, updateUser } from './users.repository';
import type { UpdateUserFields, UserRecord } from './users.types';

export function toUserResponse(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at.toISOString(),
  };
}

export async function getProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toUserResponse(user);
}

export async function updateProfile(userId: string, updates: UpdateUserFields) {
  const user = await updateUser(userId, updates);
  return toUserResponse(user);
}
