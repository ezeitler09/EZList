import { createClient } from '@supabase/supabase-js';

// Credentials come from build-time env (Vercel/Netlify) or, as a fallback,
// from a one-time paste stored in this browser (Setup screen).
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const localUrl = localStorage.getItem('cartshare_supabase_url');
const localKey = localStorage.getItem('cartshare_supabase_key');

export const supabaseUrl = envUrl || localUrl;
export const supabaseKey = envKey || localKey;
export const isConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export function saveLocalConfig(url, key) {
  localStorage.setItem('cartshare_supabase_url', url.trim());
  localStorage.setItem('cartshare_supabase_key', key.trim());
  window.location.reload();
}
