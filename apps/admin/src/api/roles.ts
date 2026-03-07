import client from './client';

export interface SpecialRolesResponse {
  DECKER: Array<{ id: string; name: string; userId: string; username: string }>;
  SPIDER: Array<{ id: string; name: string; userId: string; username: string }>;
  GRIDGOD: Array<{ id: string; name: string; userId: string; username: string }>;
}

export async function getSpecialRoles(): Promise<SpecialRolesResponse> {
  const { data } = await client.get('/admin/roles');
  return data;
}

export async function assignRole(personaId: string, role: string): Promise<void> {
  await client.post(`/admin/roles/${personaId}/assign`, { role });
}

export async function removeRole(personaId: string): Promise<void> {
  await client.post(`/admin/roles/${personaId}/remove`);
}
