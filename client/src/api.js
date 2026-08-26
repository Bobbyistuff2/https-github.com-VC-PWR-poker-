const API_URL = import.meta.env.VITE_API_URL;

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
  guestLogin: (name, phone) =>
    request('/api/guest', { method: 'POST', body: JSON.stringify({ name, phone }) }),
  saveProfile: (name) =>
    request('/api/profile', { method: 'POST', body: JSON.stringify({ name }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
};
