// supabase-client.js
const { url, anonKey } = window.VOUCHR_CONFIG.supabase;
export const supabase = window.supabase.createClient(url, anonKey);