import { redis } from '../config/redis';
import { generateOtp } from '../lib/otp';
import { generateToken, generateRefreshToken } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';
import { findOrCreateByPhone } from './user.service';

const OTP_TTL = 300;
const REFRESH_TTL = 30 * 24 * 3600;

export async function sendOtp(phone: string): Promise<void> {
  const code = generateOtp();
  await redis.setex(`otp:${phone}`, OTP_TTL, code);
  logger.info({ phone, code }, 'OTP enviado');
}

export async function verifyOtpAndLogin(phone: string, code: string) {
  const stored = await redis.get(`otp:${phone}`);
  if (!stored) throw new AppError(400, 'Codigo no solicitado o expirado');

  if (stored !== code) throw new AppError(400, 'Codigo incorrecto');

  await redis.del(`otp:${phone}`);

  const user = await findOrCreateByPhone(phone);
  const userId = user.id;
  const accessToken = generateToken({ userId, phone });
  const refreshToken = generateRefreshToken();

  await redis.setex(`refresh:${refreshToken}`, REFRESH_TTL, userId);
  await redis.setex(`phone:${userId}`, REFRESH_TTL, phone);

  logger.info({ userId, phone }, 'Usuario autenticado');

  return { userId, accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  const userId = await redis.get(`refresh:${refreshToken}`);
  if (!userId) throw new AppError(401, 'Refresh token invalido o expirado');

  await redis.del(`refresh:${refreshToken}`);

  const phone = await redis.get(`phone:${userId}`);
  const accessToken = generateToken({ userId, phone: phone || '' });
  const newRefreshToken = generateRefreshToken();

  await redis.setex(`refresh:${newRefreshToken}`, REFRESH_TTL, userId);

  return { accessToken, refreshToken: newRefreshToken };
}
