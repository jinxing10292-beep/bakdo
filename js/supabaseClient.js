const { supabase: supabaseConfig } = window.appConfig || {};

window.supabase = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);

if (supabaseConfig && supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey) {
  const SupabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);

  if (SupabaseLib && typeof SupabaseLib.createClient === 'function') {
    window.supabase = SupabaseLib.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
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
