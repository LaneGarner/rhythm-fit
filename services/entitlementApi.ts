import { getApiEndpoint, isBackendConfigured } from '../config/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Reads the caller's own comp_access flag (RLS: users can select their own
// profile row). Grants free Coach access outside of a paid subscription.
export async function fetchCompAccess(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('comp_access')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Comp access fetch error:', error);
    return false;
  }
  return data?.comp_access === true;
}

export class RedeemCodeError extends Error {}

/** Redeem a comp code for free Coach access. Resolves on success. */
export async function redeemCompCode(
  code: string,
  accessToken: string
): Promise<void> {
  if (!isBackendConfigured()) {
    throw new RedeemCodeError('Server is not configured for this build.');
  }
  const response = await fetch(getApiEndpoint('/api/redeem-code'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new RedeemCodeError(
      response.status === 400
        ? "That code isn't valid."
        : 'Something went wrong. Please try again.'
    );
  }
}
