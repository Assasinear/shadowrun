import client from './client';
import type { PaginatedResponse } from '../types';

export interface AccessTokenItem {
  id: string;
  token: string;
  personaId: string;
  hostId: string;
  purpose?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  persona?: { id: string; name: string } | null;
  host?: { id: string; name: string } | null;
}

export interface GetAccessTokensParams {
  personaId?: string;
  hostId?: string;
  page?: number;
  limit?: number;
}

export async function getAccessTokens(params: GetAccessTokensParams = {}): Promise<PaginatedResponse<AccessTokenItem>> {
  const { data } = await client.get('/admin/access-tokens', { params });
  return data;
}

export async function deleteAccessToken(id: string): Promise<void> {
  await client.delete(`/admin/access-tokens/${id}`);
}
