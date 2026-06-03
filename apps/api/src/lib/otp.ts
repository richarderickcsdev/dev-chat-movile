import { randomInt } from 'crypto';
import { env } from '../config/env';

export function generateOtp(): string {
  return env.OTP_BYPASS_CODE || String(randomInt(100000, 999999));
}
