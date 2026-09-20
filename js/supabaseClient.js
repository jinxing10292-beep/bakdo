const { supabase: supabaseConfig } = window.appConfig || {};

window.supabase = null;

if (supabaseConfig && supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey) {
  const hasClient = typeof window.supabaseClient !== 'undefined' || typeof window.supabase !== 'undefined';

  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    window.supabase = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
}

window.__bakdo = window.__bakdo || {};
window.__bakdo.supabase = window.supabase;
