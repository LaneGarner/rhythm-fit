import { getApiEndpoint } from '../config/api';

export async function deleteAccount(accessToken: string): Promise<void> {
  const response = await fetch(getApiEndpoint('/api/delete-account'), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to delete account');
  }
}
