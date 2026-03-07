import client from './client';
import type { PaginatedResponse, GridLog, AdminLog } from '../types';

export interface GetGridLogsParams {
  type?: string;
  actorPersonaId?: string;
  targetPersonaId?: string;
  targetHostId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getGridLogs(params: GetGridLogsParams = {}): Promise<PaginatedResponse<GridLog>> {
  const { data } = await client.get('/admin/logs/grid', { params });
  return data;
}

export interface GetAdminLogsParams {
  action?: string;
  adminUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getAdminLogs(params: GetAdminLogsParams = {}): Promise<PaginatedResponse<AdminLog>> {
  const { data } = await client.get('/admin/logs/admin', { params });
  return data;
}

export async function exportGridLogsCsv(params: GetGridLogsParams = {}): Promise<Blob> {
  const { data } = await client.get('/admin/logs/grid/csv', {
    params,
    responseType: 'blob',
  });
  return data;
}

export async function exportAdminLogsCsv(params: GetAdminLogsParams = {}): Promise<Blob> {
  const { data } = await client.get('/admin/logs/admin/csv', {
    params,
    responseType: 'blob',
  });
  return data;
}
