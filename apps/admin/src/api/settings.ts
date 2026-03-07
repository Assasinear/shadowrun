import client from './client';
import type { SystemSetting } from '../types';

export async function getSettings(): Promise<SystemSetting[]> {
  const { data } = await client.get('/admin/settings');
  return data;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await client.patch(`/admin/settings/${key}`, { value });
}

export async function bulkUpdateSettings(settings: { key: string; value: string }[]): Promise<void> {
  await client.post('/admin/settings/bulk', { settings });
}
