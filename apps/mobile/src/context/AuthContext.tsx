import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAccessToken, saveTokens, clearTokens, BASE_URL } from '../api/client';
import { verifyOtp as apiVerifyOtp } from '../api/auth';
import { User } from '../types';
import { connectSocket, disconnectSocket } from '../socket';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getAccessToken();
      if (token) {
        const res = await fetch(`${BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setIsAuthenticated(true);
          await connectSocket();
        }
      }
    } catch {
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  }

  async function sendOtp(phone: string) {
    const res = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
  }

  async function verifyOtp(phone: string, code: string) {
    const data = await apiVerifyOtp(phone, code);
    const me = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const userData = await me.json();
    setUser(userData);
    setIsAuthenticated(true);
    await connectSocket();
  }

  async function logout() {
    disconnectSocket();
    await clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
