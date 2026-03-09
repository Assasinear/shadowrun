import client from './client';
import type { PaginatedResponse, Wallet, Transaction, Subscription } from '../types';

export interface GetWalletsParams {
  search?: string;
  ownerType?: string;
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
  status?: string;
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

export interface GetSubscriptionsParams {
  type?: string;
  payerType?: string;
  payerId?: string;
  payeeType?: string;
  payeeId?: string;
  page?: number;
  limit?: number;
}

export async function getSubscriptions(params: GetSubscriptionsParams = {}): Promise<PaginatedResponse<Subscription>> {
  const { data } = await client.get('/admin/economy/subscriptions', { params });
  return data;
}

export async function createSubscription(body: Record<string, unknown>): Promise<void> {
  await client.post('/admin/economy/subscriptions', body);
}

export async function deleteSubscription(id: string): Promise<void> {
  await client.delete(`/admin/economy/subscriptions/${id}`);
}

export interface GeneratePaymentQrBody {
  targetType: 'PERSONA' | 'HOST';
  targetId: string;
  amount: number;
  purpose?: string;
}

export interface GeneratePaymentQrResult {
  qrDataUrl: string;
  payload: {
    type: 'STATIC_PAYMENT';
    targetType: 'PERSONA' | 'HOST';
    targetId: string;
    targetName: string;
    amount: number;
    purpose?: string;
  };
}

export async function generatePaymentQr(body: GeneratePaymentQrBody): Promise<GeneratePaymentQrResult> {
  const { data } = await client.post('/admin/economy/qr/payment', body);
  return data;
}

export async function createAdminTransfer(body: { fromWalletId: string; toWalletId: string; amount: number; purpose?: string }): Promise<void> {
  await client.post('/admin/economy/admin-transfer', body);
}

export interface TransferParty {
  id: string;
  name: string | null;
  type: 'PERSONA' | 'HOST' | 'WALLET' | 'UNKNOWN';
}

export interface Transfer {
  id: string;
  amount: number | string;
  status: string;
  isTheft: boolean;
  isAdmin: boolean;
  purpose: string | null;
  createdAt: string;
  from: TransferParty | null;
  to: TransferParty;
}

export interface GetTransfersParams {
  search?: string;
  isTheft?: boolean;
  isAdmin?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getTransfers(params: GetTransfersParams = {}): Promise<{ items: Transfer[]; total: number; page: number; limit: number }> {
  const { data } = await client.get('/admin/economy/transfers', { params });
  return data;
}

export async function getWalletTransactions(walletId: string, params: { dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}): Promise<{ items: Transaction[]; total: number; page: number; limit: number }> {
  const { data } = await client.get(`/admin/economy/wallets/${walletId}/transactions`, { params });
  return data;
}
