import client from './client';
import type { FileRecord } from '../types';

export interface GetFilesParams {
  search?: string;
  personaId?: string;
  hostId?: string;
}

export async function getFiles(params: GetFilesParams = {}): Promise<FileRecord[]> {
  const { data } = await client.get('/admin/files', { params });
  return data;
}

export async function getFile(id: string): Promise<FileRecord> {
  const { data } = await client.get(`/admin/files/${id}`);
  return data;
}

export async function createFile(body: Record<string, unknown>): Promise<FileRecord> {
  const { data } = await client.post('/admin/files', body);
  return data;
}

export async function updateFile(id: string, body: Record<string, unknown>): Promise<FileRecord> {
  const { data } = await client.patch(`/admin/files/${id}`, body);
  return data;
}

export async function deleteFile(id: string): Promise<void> {
  await client.delete(`/admin/files/${id}`);
}
