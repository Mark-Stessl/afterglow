import { describe, expect, it } from 'vitest';
import { createStore, type KV } from './store';
import type { Item } from './types';

const memory = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
};
const game = { type: 'game', title: 'Astro Bot', status: 'active' } as const;

describe('store', () => {
  it('adds items with id, timestamps and an empty trophy list, newest first', () => {
    const s = createStore(memory());
    const a = s.add(game);
    s.add({ ...game, title: 'Hades' });
    expect(a.id).toBeTruthy();
    expect(a.addedAt).toBe(a.updatedAt);
    expect(a.trophies).toEqual([]);
    expect(s.all().map(i => i.title)).toEqual(['Hades', 'Astro Bot']);
    expect(s.all('movie')).toEqual([]);
  });

  it('persists to storage and loads it again', () => {
    const kv = memory();
    createStore(kv).add(game);
    expect(createStore(kv).all()).toHaveLength(1);
  });

  it('sets finishedAt when an item becomes done, unless given', () => {
    const s = createStore(memory());
    const a = s.add(game);
    expect(s.update(a.id, { status: 'done' })?.finishedAt).toBeTruthy();
    const b = s.add(game);
    expect(s.update(b.id, { status: 'done', finishedAt: null })?.finishedAt).toBeNull();
    expect(s.update('missing', { status: 'done' })).toBeNull();
  });

  it('leaves a tombstone when removing, for sync', () => {
    const s = createStore(memory());
    const a = s.add(game);
    s.remove(a.id);
    expect(s.all()).toHaveLength(0);
    expect(s.snapshot().deleted.map(d => d.id)).toEqual([a.id]);
  });

  it('imports a Nightshelf backup: merge adds only new items', () => {
    const s = createStore(memory());
    const a = s.add(game);
    const backup = JSON.stringify({
      app: 'nightshelf', version: 1,
      items: [{ ...a, title: 'changed' }, { id: 'x1', type: 'movie', title: 'Dune', status: 'done' }, { nope: true }],
    });
    expect(s.importJSON(backup)).toBe(1);
    expect(s.get(a.id)?.title).toBe('Astro Bot');
    expect(s.get('x1')?.title).toBe('Dune');
  });

  it('imports with replace: backup becomes the data, dropped items get tombstones', () => {
    const s = createStore(memory());
    const a = s.add(game);
    expect(s.importJSON(JSON.stringify([{ id: 'x1', type: 'movie', title: 'Dune', status: 'done' }]), 'replace')).toBe(1);
    expect(s.all().map(i => i.id)).toEqual(['x1']);
    expect(s.snapshot().deleted.map(d => d.id)).toContain(a.id);
  });

  it('rejects files that are not backups', () => {
    const s = createStore(memory());
    expect(() => s.importJSON('{"hello":1}')).toThrow();
    expect(() => s.importJSON('not json')).toThrow();
  });

  it('notifies listeners and marks sync takeovers as silent', () => {
    const s = createStore(memory());
    const calls: boolean[] = [];
    s.subscribe((_, o) => calls.push(o.silent));
    s.add(game);
    s.replaceAll({ items: [] as Item[], deleted: [] });
    expect(calls).toEqual([false, true]);
  });

  it('exports a backup that imports again', () => {
    const s = createStore(memory());
    s.add(game);
    const t = createStore(memory());
    expect(t.importJSON(s.exportJSON())).toBe(1);
  });
});
