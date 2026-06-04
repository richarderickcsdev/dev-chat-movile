import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAccessToken, clearTokens, BASE_URL } from '../api/client';
import { User } from '../types';
import { connectSocket, disconnectSocket } from '../socket';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  checkSession: () => Promise<'auth' | 'profile' | 'app'>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const checkSession = useCallback(async (): Promise<'auth' | 'profile' | 'app'> => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return 'auth';
      }
      const res = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        await clearTokens();
        setIsAuthenticated(false);
        setUser(null);
        return 'auth';
      }
      const userData = await res.json();
      setUser(userData);
      connectSocket(token).catch((err) => console.warn('Socket connection failed:', err?.message));
      setIsAuthenticated(true);
      if (!userData.name) {
        return 'profile';
      }
      return 'app';
    } catch {
      await clearTokens();
      setIsAuthenticated(false);
      setUser(null);
      return 'auth';
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user, checkSession, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
