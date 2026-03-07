import client from './client';
import type { PaginatedResponse, License } from '../types';

export interface GetLicensesParams {
  search?: string;
  personaId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export async function getLicenses(params: GetLicensesParams = {}): Promise<PaginatedResponse<License>> {
  const { data } = await client.get('/admin/licenses', { params });
  return data;
}

export async function deleteLicense(id: string): Promise<void> {
  await client.delete(`/admin/licenses/${id}`);
}
