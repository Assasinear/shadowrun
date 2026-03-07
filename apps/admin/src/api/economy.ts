import client from './client';
import type { PaginatedResponse, Wallet, Transaction, Subscription } from '../types';

export interface GetWalletsParams {
  search?: string;
}

export async function getWallets(params: GetWalletsParams = {}): Promise<Wallet[]> {
  const { data } = await client.get('/admin/economy/wallets', { params });
  return data;
}

export async function setBalance(walletId: string, balance: number): Promise<void> {
  await client.patch(`/admin/economy/wallets/${walletId}/balance`, { balance });
}

export async function deposit(walletId: string, amount: number): Promise<void> {
  await client.post(`/admin/economy/wallets/${walletId}/deposit`, { amount });
}

export interface GetTransactionsParams {
  walletId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getTransactions(params: GetTransactionsParams = {}): Promise<PaginatedResponse<Transaction>> {
  const { data } = await client.get('/admin/economy/transactions', { params });
  return data;
}

export async function exportTransactionsCsv(params: GetTransactionsParams = {}): Promise<Blob> {
  const { data } = await client.get('/admin/economy/transactions/csv', {
    params,
    responseType: 'blob',
  });
  return data;
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data } = await client.get('/admin/economy/subscriptions');
  return data;
}

export async function createSubscription(body: Record<string, unknown>): Promise<void> {
  await client.post('/admin/economy/subscriptions', body);
}

export async function deleteSubscription(id: string): Promise<void> {
  await client.delete(`/admin/economy/subscriptions/${id}`);
}

export async function generatePaymentQr(body: Record<string, unknown>): Promise<{ qrDataUrl: string }> {
  const { data } = await client.post('/admin/economy/qr/payment', body);
  return data;
}
