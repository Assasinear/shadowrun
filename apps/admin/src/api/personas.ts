import client from './client';
import type { PaginatedResponse, Persona } from '../types';

export interface GetPersonasParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function getPersonas(params: GetPersonasParams = {}): Promise<PaginatedResponse<Persona>> {
  const { data } = await client.get('/admin/personas', { params });
  return data;
}

export async function getPersona(id: string): Promise<Persona> {
  const { data } = await client.get(`/admin/personas/${id}`);
  return data;
}

export async function createPersona(body: Record<string, unknown>): Promise<Persona> {
  const { data } = await client.post('/admin/personas', body);
  return data;
}

export async function updatePersona(id: string, body: Record<string, unknown>): Promise<Persona> {
  const { data } = await client.patch(`/admin/personas/${id}`, body);
  return data;
}

export async function blockPersona(id: string): Promise<void> {
  await client.post(`/admin/personas/${id}/block`);
}

export async function unblockPersona(id: string): Promise<void> {
  await client.post(`/admin/personas/${id}/unblock`);
}

export async function deletePersona(id: string): Promise<void> {
  await client.delete(`/admin/personas/${id}`);
}

export async function issueLicenses(id: string, body: Record<string, unknown>): Promise<void> {
  await client.post(`/admin/personas/${id}/licenses`, body);
}

export async function removeLicense(personaId: string, licenseId: string): Promise<void> {
  await client.delete(`/admin/personas/${personaId}/licenses/${licenseId}`);
}

export async function changeRole(id: string, role: string): Promise<void> {
  await client.post(`/admin/personas/${id}/role`, { role });
}

export async function getSinQr(id: string): Promise<{ qrDataUrl: string }> {
  const { data } = await client.get(`/admin/personas/${id}/qr-sin`);
  return data;
}
