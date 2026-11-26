/** Sync between devices through the worker. Per item the newer change wins; deletions beat older copies. */
import { store } from './store';
import type { Item, Snapshot } from './types';
import { SYNC_KEY, fail, lsJSON, lsMerge, workerFetch, type CodedError } from './worker';

interface SyncState { key: string | null; version: number; lastSync: string }
export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'ok' | 'error';

const stamp = (i: Item) => i.updatedAt || i.addedAt || '';

export function merge(local: Snapshot, remote: Partial<Snapshot>): Snapshot {
  const del = new Map<string, string>();
  [...(remote.deleted || []), ...(local.deleted || [])].forEach(d => { if (!del.has(d.id) || del.get(d.id)! < d.at) del.set(d.id, d.at); });
  const items = new Map<string, Item>();
  [...(remote.items || []), ...(local.items || [])].forEach(it => { const cur = items.get(it.id); if (!cur || stamp(cur) < stamp(it)) items.set(it.id, it); });
  const out = [...items.values()].filter(it => !del.has(it.id) || stamp(it) > del.get(it.id)!);
  out.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const kept = new Set(out.map(i => i.id));
  const deleted = [...del].filter(([id]) => !kept.has(id)).map(([id, at]) => ({ id, at }));
  return { items: out, deleted };
}
const fingerprint = (d: Snapshot) => d.items.map(i => i.id + stamp(i)).join('|') + '#' + d.deleted.map(x => x.id).sort().join('|');

const state = () => lsJSON<SyncState>(SYNC_KEY);
const save = (p: Partial<SyncState>) => lsMerge<SyncState>(SYNC_KEY, p);
const listeners = new Set<(s: { status: SyncStatus; error: string | null }) => void>();
let status: SyncStatus = 'idle', lastError: string | null = null, lastPull = 0;
let timer: ReturnType<typeof setTimeout> | null = null, busy: Promise<void> | null = null;

function setStatus(s: SyncStatus, err: string | null = null) {
  status = s; lastError = err;
  listeners.forEach(fn => fn({ status, error: lastError }));
}
export const enabled = () => !!state().key;

interface Remote extends Partial<Snapshot> { version: number }

async function push(attempt = 0): Promise<void> {
  const snap = store.snapshot();
  try {
    const r = await workerFetch<{ version: number }>('/data', { method: 'PUT', body: { ...snap, baseVersion: state().version ?? 0 } });
    save({ version: r.version, lastSync: new Date().toISOString() });
  } catch (e) {
    if ((e as CodedError).code === 'conflict' && attempt < 3) { await pull(); return push(attempt + 1); }
    throw e;
  }
}

async function pull() {
  const remote = await workerFetch<Remote>('/data');
  const merged = merge(store.snapshot(), remote);
  const changedLocal = fingerprint(merged) !== fingerprint(store.snapshot());
  if (changedLocal) store.replaceAll(merged);
  save({ version: remote.version, lastSync: new Date().toISOString() });
  lastPull = Date.now();
  return { changedLocal, needsPush: fingerprint(merged) !== fingerprint({ items: remote.items || [], deleted: remote.deleted || [] }) };
}

function onError(e: unknown) {
  const code = (e as CodedError).code || 'error';
  setStatus('error', code);
  if (code === 'key_required') save({ key: null });
}

export async function syncNow(): Promise<void> {
  if (!enabled()) return;
  if (busy) return busy;
  if (timer) { clearTimeout(timer); timer = null; }
  setStatus('syncing');
  busy = (async () => {
    try {
      const r = await pull();
      if (r.needsPush) await push();
      setStatus('ok');
    } catch (e) { onError(e); } finally { busy = null; }
  })();
  return busy;
}

function schedulePush() {
  if (!enabled()) return;
  setStatus('pending');
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (busy) { schedulePush(); return; }
    setStatus('syncing');
    busy = push().then(() => setStatus('ok')).catch(onError).finally(() => { busy = null; });
  }, 2500);
}

function genKey() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = [...crypto.getRandomValues(new Uint8Array(20))].map(b => abc[b % abc.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}
async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** First device: claim the worker and get a new key. */
export async function setup() {
  const info = await workerFetch<{ claimed: boolean }>('/');
  if (info.claimed) throw fail('already_claimed');
  const key = genKey();
  await workerFetch('/claim', { method: 'POST', body: { keyHash: await sha256(key) } });
  save({ key, version: 0 });
  await syncNow();
  if (status === 'error') throw fail(lastError || 'error');
  return key;
}

/** Another device: connect with the existing key (the same key Nightshelf uses). */
export async function connect(rawKey: string) {
  const key = rawKey.trim().toUpperCase().replace(/\s+/g, '');
  save({ key, version: 0 });
  try { await workerFetch('/data'); }
  catch (e) { save({ key: null }); throw fail((e as CodedError).code === 'key_required' ? 'key_wrong' : (e as CodedError).code); }
  await syncNow();
  if (status === 'error') throw fail(lastError || 'error');
}

export function disconnect() {
  if (timer) clearTimeout(timer);
  save({ key: null, version: 0 });
  setStatus('idle');
}

export const syncStatus = () => ({ status, error: lastError, lastSync: state().lastSync || null });
export const onSyncChange = (fn: (s: { status: SyncStatus; error: string | null }) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Wire sync to the store and the page lifecycle. Call once at start. */
export function startSync() {
  store.subscribe((_, opts) => { if (!opts.silent) schedulePush(); });
  document.addEventListener('visibilitychange', () => {
    if (!enabled()) return;
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer); timer = null;
      const snap = store.snapshot();
      workerFetch<{ version: number }>('/data', { method: 'PUT', keepalive: true, body: { ...snap, baseVersion: state().version ?? 0 } })
        .then(r => save({ version: r.version, lastSync: new Date().toISOString() })).catch(() => {});
    } else if (document.visibilityState === 'visible' && Date.now() - lastPull > 30000) syncNow();
  });
  if (enabled()) syncNow();
}
