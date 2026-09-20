window.appConfig = {
  appName: 'BAKDO',
  currencyName: '게임 머니',
  dailyBonus: 5000,
  supabase: {
    url: 'https://YOUR_PROJECT_URL.supabase.co',
    anonKey: 'YOUR_ANON_KEY',
    enabled: false,
  },
};

window.__bakdo = window.__bakdo || {};
window.__bakdo.config = window.appConfig;
