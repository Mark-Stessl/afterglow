/**
 * The Cloudflare worker shared with Nightshelf (PSN, Steam, MangaDex, sync, push).
 * Owner auth is the X-Nightshelf-Key header; the header name stays so the same worker serves both apps.
 */

export const DEFAULT_WORKER = 'https://nightshelf-psn.stesslmark4.workers.dev';
const WORKER_KEY = 'afterglow.worker';
export const SYNC_KEY = 'afterglow.sync';

export function lsJSON<T extends object>(key: string): Partial<T> {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || {}; } catch { return {}; }
}
export function lsMerge<T extends object>(key: string, patch: Partial<T>): Partial<T> {
  const next = { ...lsJSON<T>(key), ...patch };
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  return next;
}

export const workerUrl = () => {
  try { return (localStorage.getItem(WORKER_KEY) || DEFAULT_WORKER).replace(/\/+$/, ''); } catch { return DEFAULT_WORKER; }
};
export const setWorkerUrl = (url: string) => { try { localStorage.setItem(WORKER_KEY, url.trim()); } catch { /* ignore */ } };

/** The sync key header, when sync is set up. */
export const authHeader = (): Record<string, string> => {
  const k = lsJSON<{ key: string }>(SYNC_KEY).key;
  return k ? { 'X-Nightshelf-Key': k } : {};
};

export type CodedError = Error & { code: string };
export const fail = (code: string, msg?: string): CodedError => Object.assign(new Error(msg || code), { code });

/** JSON request to the worker. Throws a CodedError with the worker's error code. */
export async function workerFetch<T = Record<string, unknown>>(
  path: string,
  { method = 'GET', body, token, keepalive = false }: { method?: string; body?: unknown; token?: string; keepalive?: boolean } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(workerUrl() + path, {
      method, keepalive,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...authHeader(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch { throw fail('network', 'Server not reachable'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw fail(data.error || 'error', data.detail || data.error || `Error ${res.status}`);
  return data as T;
}
