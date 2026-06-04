import { Platform } from 'react-native';

export const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3001'
  : 'http://192.168.18.154:3001';

let accessToken: string | null = null;
let refreshToken: string | null = null;

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

async function loadTokens(): Promise<void> {
  accessToken = await storage.getItem('accessToken');
  refreshToken = await storage.getItem('refreshToken');
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await storage.setItem('accessToken', access);
  await storage.setItem('refreshToken', refresh);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await storage.deleteItem('accessToken');
  await storage.deleteItem('refreshToken');
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
      const retry = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
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
  uploadAvatar: async (blob: Blob): Promise<{ id: string; avatar_url: string }> => {
    const token = await getAccessToken();
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.jpg');
    const res = await fetch(`${BASE_URL}/users/me/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return res.json();
  },
};
