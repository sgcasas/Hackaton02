import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { User, LoginResponse } from '../types/api';

export interface AuthValue {
  user: User | null;
  status: 'checking' | 'authenticated' | 'unauthenticated';
  login: (creds: { teamCode: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const TOKEN_KEY = 'tropelcare_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthValue['status']>('checking');

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    api
      .get<User>('/auth/me')
      .then((u) => {
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setStatus('unauthenticated');
      });
  }, []);

  async function login(creds: { teamCode: string; email: string; password: string }) {
    const res = await api.post<LoginResponse>('/auth/login', creds);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    setStatus('authenticated');
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
