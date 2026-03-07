import client from './client';

export interface LoginResponse {
  access_token: string;
  personaId: string;
  role: string;
  requires2fa?: boolean;
  userId?: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', { username, password });
  return data;
}

export async function setup2fa(): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const { data } = await client.post('/auth/2fa/setup');
  return data;
}

export async function verify2fa(code: string): Promise<void> {
  await client.post('/auth/2fa/verify', { code });
}

export async function disable2fa(): Promise<void> {
  await client.post('/auth/2fa/disable');
}

export async function verifyLogin2fa(userId: string, code: string): Promise<{ access_token: string; personaId: string; role: string }> {
  const { data } = await client.post('/auth/verify-login-2fa', { userId, code });
  return data;
}
