import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://mas-rehabilitation-assign-regards.trycloudflare.com';

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function safeGet(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

async function safeSet(key: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(key, value); } catch {}
}

async function safeDel(key: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key); } catch {}
}

async function loadTokens(): Promise<void> {
  accessToken = await safeGet('accessToken');
  refreshToken = await safeGet('refreshToken');
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await safeSet('accessToken', access);
  await safeSet('refreshToken', refresh);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await safeDel('accessToken');
  await safeDel('refreshToken');
}

export async function getAccessToken(): Promise<string | null> {
  if (!accessToken) await loadTokens();
  return accessToken;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && refreshToken) {
    const renewed = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (renewed.ok) {
      const data = await renewed.json();
      await saveTokens(data.accessToken, data.refreshToken || refreshToken);
      headers['Authorization'] = `Bearer ${data.accessToken}`;
      const retry = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      return retry.json();
    }
    await clearTokens();
    throw new Error('Sesion expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || 'Error desconocido');
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
