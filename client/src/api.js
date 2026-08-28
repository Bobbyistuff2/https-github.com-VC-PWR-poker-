// Empty when unset, so requests are relative to the current origin — used in
// production where Vercel proxies /api, /auth, and /socket.io through to the
// Render backend, keeping the session cookie first-party (mobile Safari and
// other browsers block third-party cookies, which broke auth on the phone).
const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  me: () => request('/api/me'),
  saveProfile: (name) =>
    request('/api/profile', { method: 'POST', body: JSON.stringify({ name }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getAchievements: () => request('/api/achievements'),
  getWheelTiers: () => request('/api/wheel'),
  spinWheel: (tier) => request('/api/wheel/spin', { method: 'POST', body: JSON.stringify({ tier }) }),
  getLeaderboard: () => request('/api/leaderboard'),
  getStats: (userId) => request(`/api/stats/${userId}`),
  acceptTerms: () => request('/api/terms/accept', { method: 'POST' }),
  getHiLoState: () => request('/api/hilo/state'),
  startHiLo: (wager) => request('/api/hilo/start', { method: 'POST', body: JSON.stringify({ wager }) }),
  guessHiLo: (direction) => request('/api/hilo/guess', { method: 'POST', body: JSON.stringify({ direction }) }),
  cashOutHiLo: () => request('/api/hilo/cashout', { method: 'POST' }),
  getShop: () => request('/api/shop'),
  buyItem: (itemId) => request('/api/shop/buy', { method: 'POST', body: JSON.stringify({ itemId }) }),
  equipItem: (itemId) => request('/api/shop/equip', { method: 'POST', body: JSON.stringify({ itemId }) }),
  redeemCode: (code) => request('/api/codes/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
};
