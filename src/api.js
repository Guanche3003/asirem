// En production, VITE_API_URL pointe vers l'API hébergée séparément (Render/Railway).
// En local, on reste sur le proxy Vite (/api -> 127.0.0.1:3001).
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}/api${url}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* réponse vide */
  }
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: (url) => request(url, { method: 'DELETE' }),
};

export const euro = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);

export const number = (value, digits = 2) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(Number(value) || 0);

export const dateFr = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};

export const dateTimeFr = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
};
