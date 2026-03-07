import client from './client';
import type { Device } from '../types';

export interface GetDevicesParams {
  unownedOnly?: boolean;
}

export async function getDevices(params: GetDevicesParams = {}): Promise<Device[]> {
  const { data } = await client.get('/admin/devices', { params });
  return data;
}

export async function createDevice(body: Record<string, unknown>): Promise<Device> {
  const { data } = await client.post('/admin/devices', body);
  return data;
}

export async function bindDevice(id: string, personaId: string): Promise<void> {
  await client.post(`/admin/devices/${id}/bind`, { personaId });
}

export async function unbindDevice(id: string): Promise<void> {
  await client.post(`/admin/devices/${id}/unbind`);
}

export async function resetBrick(id: string): Promise<void> {
  await client.post(`/admin/devices/${id}/reset-brick`);
}
