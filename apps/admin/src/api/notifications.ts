import client from './client';
import type { PaginatedResponse } from '../types';

export interface Notification {
  id: string;
  personaId: string;
  type: string;
  payload?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
  persona?: { id: string; name: string } | null;
}

export interface GetNotificationsParams {
  personaId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<PaginatedResponse<Notification>> {
  const { data } = await client.get('/admin/notifications', { params });
  return data;
}

export async function broadcastNotification(body: { type: string; payload?: Record<string, unknown>; personaIds?: string[] }): Promise<{ count: number }> {
  const { data } = await client.post('/admin/notifications/broadcast', body);
  return data;
}

export async function markAllRead(personaId: string): Promise<void> {
  await client.post(`/admin/notifications/${personaId}/mark-all-read`);
}
