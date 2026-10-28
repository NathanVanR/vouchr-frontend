// js/session.js — helpers shared by the staff dashboard and project pages

export function getSupabaseClient() {
  if (window._supabaseClient) return window._supabaseClient;

  const cfg = window.VOUCHR_CONFIG?.supabase;
  if (!cfg?.url || !cfg?.anonKey) {
    console.error('VOUCHR_CONFIG.supabase is missing');
    return null;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library not found');
    return null;
  }

  const { createClient } = supabase;
  try {
    window._supabaseClient = createClient(cfg.url, cfg.anonKey);
    return window._supabaseClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/** Fresh access token from the current Supabase session (the stored one may have expired). */
export async function getAuthToken() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.access_token || null;
}

export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const PROJECT_TYPE_LABELS = {
  FEEDING_SCHEME: 'Feeding scheme',
  GLASSES_DRIVE: 'Reading glasses drive',
  SCHOOL_SUPPLIES_DRIVE: 'School supplies drive',
  OTHER: 'Other'
};
