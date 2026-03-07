import client from './client';
import type { PaginatedResponse, Message, MessageThread } from '../types';

export interface GetMessagesParams {
  search?: string;
  senderPersonaId?: string;
  receiverPersonaId?: string;
  senderType?: string;
  receiverType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getMessages(params: GetMessagesParams = {}): Promise<PaginatedResponse<Message>> {
  const { data } = await client.get('/admin/messages', { params });
  return data;
}

export async function getThreads(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<MessageThread>> {
  const { data } = await client.get('/admin/messages/threads', { params });
  return data;
}

export async function getThreadMessages(threadId: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Message>> {
  const { data } = await client.get(`/admin/messages/threads/${threadId}`, { params });
  return data;
}
