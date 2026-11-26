import { useSyncExternalStore } from 'react';
import type { Item, ItemType, NewItem, Snapshot, Tombstone } from './types';

/** Minimal storage interface so tests can run without a browser. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORE_KEY = 'afterglow.v1';
/** Nightshelf's key on the same origin (mark-stessl.github.io), for the one-click import. */
export const NIGHTSHELF_KEY = 'nightshelf.v1';

const now = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

type Listener = (state: State, opts: { silent: boolean }) => void;
interface State { items: Item[]; deleted: Tombstone[]; updatedAt: string | null }

/** Items whose shape is usable at all (id, type, title). */
function validItems(raw: unknown): Item[] | null {
  const data = raw as { items?: unknown } | unknown[];
  const list = Array.isArray(data) ? data : (data as { items?: unknown })?.items;
  if (!Array.isArray(list)) return null;
  return list.filter((i): i is Item => !!i && typeof i === 'object' && typeof (i as Item).id === 'string' && typeof (i as Item).type === 'string');
}

export function createStore(kv: KV | null, key = STORE_KEY) {
  let state: State = { items: [], deleted: [], updatedAt: null };
  const listeners = new Set<Listener>();
  let version = 0; // bumps on every change, for React

  function load() {
    try {
      const raw = kv?.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) state = { deleted: [], updatedAt: null, ...parsed };
    } catch (e) { console.warn('Could not load data', e); }
  }
  function persist() {
    try { kv?.setItem(key, JSON.stringify(state)); }
    catch (e) { console.warn('Could not save data', e); }
  }
  function save({ silent = false } = {}) {
    state.updatedAt = now();
    version++;
    persist();
    listeners.forEach(fn => fn(state, { silent }));
  }
  const tombstone = (id: string) => {
    state.deleted = state.deleted.filter(d => d.id !== id);
    state.deleted.push({ id, at: now() });
  };

  function all(type?: ItemType): Item[] {
    return type ? state.items.filter(i => i.type === type) : state.items.slice();
  }
  const get = (id: string) => state.items.find(i => i.id === id);

  function add(data: NewItem): Item {
    const t = now();
    const item = { id: uid(), addedAt: t, trophies: [], ...data, updatedAt: t } as Item;
    state.items.unshift(item);
    save();
    return item;
  }

  function update(id: string, patch: Partial<Item>): Item | null {
    const item = get(id);
    if (!item) return null;
    if (patch.status === 'done' && item.status !== 'done' && !('finishedAt' in patch)) patch = { ...patch, finishedAt: now() };
    Object.assign(item, patch, { updatedAt: now() });
    save();
    return item;
  }

  /** Put an item back to an earlier copy (for undo). */
  function restore(snap: Item) {
    const i = state.items.findIndex(x => x.id === snap.id);
    if (i < 0) return;
    state.items[i] = { ...snap, updatedAt: now() };
    save();
  }

  function remove(id: string) {
    state.items = state.items.filter(i => i.id !== id);
    tombstone(id);
    save();
  }

  function exportJSON() {
    return JSON.stringify({ app: 'afterglow', version: 1, exportedAt: now(), items: state.items }, null, 2);
  }

  /**
   * Read a backup (Afterglow or Nightshelf, file or raw localStorage value).
   * merge: add items that are not here yet. replace: the backup becomes the data.
   * Returns how many items were added (merge) or loaded (replace).
   */
  function importJSON(text: string, mode: 'merge' | 'replace' = 'merge'): number {
    const items = validItems(JSON.parse(text));
    if (!items) throw new Error('Not a valid Afterglow or Nightshelf backup');
    const t = now();
    let count = 0;
    if (mode === 'replace') {
      const keep = new Set(items.map(i => i.id));
      state.items.forEach(i => { if (!keep.has(i.id)) tombstone(i.id); });
      state.items = items.map(i => ({ ...i, updatedAt: t }));
      count = items.length;
    } else {
      const ids = new Set(state.items.map(i => i.id));
      items.forEach(i => { if (!ids.has(i.id)) { state.items.push({ ...i, updatedAt: t }); count++; } });
    }
    save();
    return count;
  }

  function clear() { state.items.forEach(i => tombstone(i.id)); state.items = []; save(); }

  /* For sync: read the whole state, take over a merged state. */
  const snapshot = (): Snapshot => ({ items: state.items, deleted: state.deleted });
  function replaceAll({ items, deleted }: Snapshot) {
    state.items = items;
    state.deleted = deleted;
    save({ silent: true });
  }

  function subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; }

  load();
  return {
    all, get, add, update, restore, remove, exportJSON, importJSON, clear, subscribe, snapshot, replaceAll,
    version: () => version,
  };
}

export type Store = ReturnType<typeof createStore>;

const browserKV: KV | null = typeof localStorage !== 'undefined' ? localStorage : null;
export const store = createStore(browserKV);

/** Re-render when the data changes. Returns the change counter. */
export function useStoreVersion() {
  return useSyncExternalStore(cb => store.subscribe(cb), store.version, store.version);
}

/** Raw Nightshelf data saved on this device, if any. */
export function readNightshelfLocal(): { text: string; count: number } | null {
  try {
    const text = browserKV?.getItem(NIGHTSHELF_KEY);
    if (!text) return null;
    const items = validItems(JSON.parse(text));
    return items ? { text, count: items.length } : null;
  } catch { return null; }
}
