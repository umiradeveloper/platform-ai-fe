// Klien API: access token disimpan di memori, refresh token di cookie httpOnly milik backend.
//
// Alamat backend:
//  - NEXT_PUBLIC_API_URL diisi (mis. https://api.umira.id/api/v1) → browser memanggil backend langsung.
//  - Kosong → '/api/v1' (same-origin), diteruskan Next.js ke API_PROXY_TARGET (lihat next.config.mjs)
//    atau oleh Nginx bila frontend & backend di bawah domain yang sama.
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/+$/, '');

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
const listeners = new Set<(u: User | null) => void>();

export function setSession(token: string | null, user?: User | null) {
  accessToken = token;
  if (user !== undefined) listeners.forEach((l) => l(user));
}
/** Perbarui data user di UI tanpa mengubah token. */
export function updateUser(user: User) {
  listeners.forEach((l) => l(user));
}

export function onSessionChange(fn: (u: User | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Ambil access token baru memakai refresh cookie (dideduplikasi bila dipanggil bersamaan). */
export async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!r.ok) {
          setSession(null, null);
          return false;
        }
        const j = await r.json();
        setSession(j.accessToken, j.user);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

async function errorMessage(r: Response) {
  try {
    const j = await r.json();
    const m = Array.isArray(j.message) ? j.message.join(', ') : j.message;
    return m || `Kesalahan ${r.status}`;
  } catch {
    return `Kesalahan ${r.status}`;
  }
}

/** fetch terautentikasi; otomatis refresh token sekali bila 401. Mengembalikan Response mentah. */
export async function authFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  if (r.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return authFetch(path, init, false);
  }
  return r;
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const r = await authFetch(path, { ...rest, body: json !== undefined ? JSON.stringify(json) : rest.body });
  if (!r.ok) throw new ApiError(await errorMessage(r), r.status);
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new ApiError(await errorMessage(r), r.status);
  const j = await r.json();
  setSession(j.accessToken, j.user);
  return j.user as User;
}

export async function register(name: string, email: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!r.ok) throw new ApiError(await errorMessage(r), r.status);
  const j = await r.json();
  setSession(j.accessToken, j.user);
  return j.user as User;
}

export async function logout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
  setSession(null, null);
}

export async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new ApiError(await errorMessage(r), r.status);
  return r.json();
}
