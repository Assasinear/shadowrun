import client from './client';
import type { PaginatedResponse } from '../types';

export interface BlogPost {
  id: string;
  text: string;
  personaId?: string | null;
  hostId?: string | null;
  createdAt: string;
  updatedAt?: string;
  persona?: { id: string; name: string } | null;
  host?: { id: string; name: string } | null;
}

export interface GetBlogPostsParams {
  search?: string;
  personaId?: string;
  hostId?: string;
  page?: number;
  limit?: number;
}

export async function getBlogPosts(params: GetBlogPostsParams = {}): Promise<PaginatedResponse<BlogPost>> {
  const { data } = await client.get('/admin/blog-posts', { params });
  return data;
}

export async function createBlogPost(body: { text: string; personaId?: string; hostId?: string }): Promise<BlogPost> {
  const { data } = await client.post('/admin/blog-posts', body);
  return data;
}

export async function deleteBlogPost(id: string): Promise<void> {
  await client.delete(`/admin/blog-posts/${id}`);
}

export async function massDeleteBlogPosts(ids: string[]): Promise<void> {
  await client.post('/admin/blog-posts/mass/delete', { ids });
}
