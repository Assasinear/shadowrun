import client from './client';
import type { Host } from '../types';

export interface GetHostsParams {
  search?: string;
}

export async function getHosts(params: GetHostsParams = {}): Promise<Host[]> {
  const { data } = await client.get('/admin/hosts', { params });
  return data;
}

export async function getHost(id: string): Promise<Host> {
  const { data } = await client.get(`/admin/hosts/${id}`);
  return data;
}

export async function createHost(body: Record<string, unknown>): Promise<Host> {
  const { data } = await client.post('/admin/hosts', body);
  return data;
}

export async function updateHost(id: string, body: Record<string, unknown>): Promise<Host> {
  const { data } = await client.patch(`/admin/hosts/${id}`, body);
  return data;
}

export async function deleteHost(id: string): Promise<void> {
  await client.delete(`/admin/hosts/${id}`);
}

export async function addHostFile(hostId: string, body: Record<string, unknown>): Promise<void> {
  await client.post(`/admin/hosts/${hostId}/files`, body);
}

export async function createAccessToken(hostId: string, body: Record<string, unknown>): Promise<void> {
  await client.post(`/admin/hosts/${hostId}/access-tokens`, body);
}

export async function getHostQr(id: string): Promise<{ qrDataUrl: string }> {
  const { data } = await client.get(`/admin/hosts/${id}/qr`);
  return data;
}
