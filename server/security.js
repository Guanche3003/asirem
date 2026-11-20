/** Hachage de mot de passe et gestion des sessions (sans dépendance). */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { run, get, getSetting, now } from './db.js';

const COOKIE_NAME = 'bougie_session';
const SESSION_DAYS = 7;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hex] = stored.split(':');
  try {
    const candidate = scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hex, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession() {
  const token = randomBytes(32).toString('hex');
  const created = now();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  run('DELETE FROM sessions WHERE expires_at < ?', created);
  run('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)', hashToken(token), created, expires);
  return { token, expires };
}

export function destroySession(token) {
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
}

export function readToken(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=');
  }
  return null;
}

export function isAuthenticated(req) {
  const token = readToken(req);
  if (!token) return false;
  const row = get('SELECT expires_at FROM sessions WHERE token_hash = ?', hashToken(token));
  if (!row) return false;
  if (row.expires_at < now()) {
    destroySession(token);
    return false;
  }
  return true;
}

export function login(username, password) {
  const expectedUser = getSetting('admin_username', 'admin');
  const expectedHash = getSetting('admin_password_hash', '');
  const userOk = String(username || '').trim().toLowerCase() === String(expectedUser).trim().toLowerCase();
  return userOk && verifyPassword(password, expectedHash)
    ? { username: expectedUser }
    : null;
}

export function sessionCookie(token, expires) {
  const maxAge = Math.max(0, Math.floor((new Date(expires).getTime() - Date.now()) / 1000));
  return [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function authRequired(req, res, next) {
  if (isAuthenticated(req)) return next();
  return res.status(401).json({ error: 'Authentification requise.' });
}
