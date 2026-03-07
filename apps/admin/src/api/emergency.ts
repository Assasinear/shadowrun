import client from './client';

export async function terminateAllHacks(): Promise<{ terminated: number }> {
  const { data } = await client.post('/admin/emergency/terminate-all-hacks');
  return data;
}

export async function disableDecking(): Promise<void> {
  await client.post('/admin/emergency/disable-decking');
}

export async function enableDecking(): Promise<void> {
  await client.post('/admin/emergency/enable-decking');
}

export async function getDeckingStatus(): Promise<{ enabled: boolean }> {
  const { data } = await client.get('/admin/emergency/decking-status');
  return data;
}

export async function resetAllBricks(): Promise<{ reset: number }> {
  const { data } = await client.post('/admin/emergency/reset-all-bricks');
  return data;
}

export async function exportDatabase(): Promise<Blob> {
  const { data } = await client.get('/admin/emergency/export-db', {
    responseType: 'blob',
  });
  return data;
}
