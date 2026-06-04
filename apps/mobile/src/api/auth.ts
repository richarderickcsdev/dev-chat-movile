import { saveTokens, BASE_URL } from './client';

export async function sendOtp(phone: string): Promise<void> {
  await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al verificar OTP');
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}
