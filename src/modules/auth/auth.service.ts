import jwt from 'jsonwebtoken';

import { env } from '../../config';
import { withTransaction } from '../../database';
import { ConflictError, UnauthorizedError } from '../../shared/errors';
import { createInitialBalances } from '../balances';
// Import directo a los archivos (no al barrel '../users'): users/index re-exporta users.routes,
// que importa authMiddleware de este mismo módulo — pasar por el barrel crearía un ciclo.
import { createUser, findUserByEmail } from '../users/users.repository';
import { toUserResponse } from '../users/users.service';
import { createWallet } from '../wallets';
import type { JwtPayload, LoginDTO, RegisterDTO } from './auth.types';
import { comparePassword, hashPassword } from './password.utils';

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export async function register(dto: RegisterDTO) {
  const passwordHash = await hashPassword(dto.password);

  const user = await withTransaction(async (client) => {
    try {
      const createdUser = await createUser(client, dto.email, dto.name, passwordHash);
      const wallet = await createWallet(client, createdUser.id);
      await createInitialBalances(client, wallet.id);
      return createdUser;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictError('Email already registered', 'EMAIL_ALREADY_REGISTERED');
      }
      throw err;
    }
  });

  const token = generateToken({ userId: user.id });
  return { token, user: toUserResponse(user) };
}

export async function login(dto: LoginDTO) {
  const user = await findUserByEmail(dto.email);
  if (!user) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const isValid = await comparePassword(dto.password, user.password_hash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const token = generateToken({ userId: user.id });
  return { token, user: toUserResponse(user) };
}
