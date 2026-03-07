import { useCallback, useMemo } from 'react';
import { login as apiLogin } from '../api/auth';

interface AuthUser {
  userId: string;
  personaId: string;
  role: string;
  is2faEnabled?: boolean;
}

export interface LoginResult {
  success: boolean;
  requires2fa?: boolean;
  userId?: string;
}

export function useAuth() {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  const user: AuthUser | null = useMemo(() => {
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }, [userJson]);

  const isAuthenticated = !!token && !!user;

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    const response = await apiLogin(username, password);

    if (response.requires2fa) {
      return { success: false, requires2fa: true, userId: response.userId };
    }

    if (response.role !== 'GRIDGOD') {
      throw new Error('Access denied. Only GRIDGOD role can access the admin panel.');
    }

    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify({
      personaId: response.personaId,
      role: response.role,
    }));

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
    window.location.href = `${base}/login`;
  }, []);

  return { token, user, isAuthenticated, login, logout };
}
