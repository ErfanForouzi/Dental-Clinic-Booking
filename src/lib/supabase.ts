import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const isPlaceholder = (value: string) =>
  !value ||
  value.includes('PASTE_YOUR_SUPABASE_URL_HERE') ||
  value.includes('PASTE_YOUR_PUBLISHABLE_KEY_HERE');

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured: boolean =
  !isPlaceholder(rawUrl) && !isPlaceholder(rawAnonKey) && isValidHttpUrl(rawUrl);

// Fallback URL prevents module initialization crash prior to env configuration;
// all runtime data and auth calls verify isSupabaseConfigured first.
const clientUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? rawAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
