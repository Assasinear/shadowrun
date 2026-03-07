import client from './client';
import type { PaginatedResponse } from '../types';

export interface PaymentRequest {
  id: string;
  token: string;
  creatorType: string;
  creatorPersonaId?: string | null;
  creatorHostId?: string | null;
  targetType: string;
  targetPersonaId?: string | null;
  targetHostId?: string | null;
  amount: number | string;
  purpose?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  creatorPersona?: { id: string; name: string } | null;
  creatorHost?: { id: string; name: string } | null;
  targetPersona?: { id: string; name: string } | null;
  targetHost?: { id: string; name: string } | null;
}

export interface GetPaymentRequestsParams {
  status?: string;
  creatorPersonaId?: string;
  targetPersonaId?: string;
  page?: number;
  limit?: number;
}

export async function getPaymentRequests(params: GetPaymentRequestsParams = {}): Promise<PaginatedResponse<PaymentRequest>> {
  const { data } = await client.get('/admin/payment-requests', { params });
  return data;
}
