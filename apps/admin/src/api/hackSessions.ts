import client from './client';
import type { PaginatedResponse, HackSession } from '../types';

export interface GetHackSessionsParams {
  status?: string;
  attackerPersonaId?: string;
  targetType?: string;
  targetPersonaId?: string;
  targetHostId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getHackSessions(params: GetHackSessionsParams = {}): Promise<PaginatedResponse<HackSession>> {
  const { data } = await client.get('/admin/hack-sessions', { params });
  return data;
}

export async function cancelHackSession(id: string): Promise<void> {
  await client.post(`/admin/hack-sessions/${id}/cancel`);
}

export async function massCancelActive(): Promise<{ cancelled: number }> {
  const { data } = await client.post('/admin/hack-sessions/mass/cancel-active');
  return data;
}
