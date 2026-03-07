import client from './client';
import type { PaginatedResponse, Device } from '../types';

export interface GetDevicesParams {
  search?: string;
  type?: string;
  status?: string;
  unownedOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function getDevices(params: GetDevicesParams = {}): Promise<PaginatedResponse<Device>> {
  const { data } = await client.get('/admin/devices', { params });
  return data;
}

export async function createDevice(body: Record<string, unknown>): Promise<Device> {
  const { data } = await client.post('/admin/devices', body);
  return data;
}

export async function updateDevice(id: string, body: Record<string, unknown>): Promise<Device> {
  const { data } = await client.patch(`/admin/devices/${id}`, body);
  return data;
}

export async function deleteDevice(id: string): Promise<void> {
  await client.delete(`/admin/devices/${id}`);
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

export async function massUnbindDevices(ids: string[]): Promise<void> {
  await client.post('/admin/devices/mass/unbind', { ids });
}

export async function massResetBrickDevices(ids: string[]): Promise<void> {
  await client.post('/admin/devices/mass/reset-brick', { ids });
}

export async function massDeleteDevices(ids: string[]): Promise<void> {
  await client.post('/admin/devices/mass/delete', { ids });
}
