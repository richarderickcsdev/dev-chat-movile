import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../middlewares/auth';

export interface SocketAuth {
  userId: string;
  phone: string;
}

export function verifySocketToken(token: string): SocketAuth {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    return { userId: payload.userId, phone: payload.phone };
  } catch {
    throw new Error('Token de socket invalido o expirado');
  }
}
