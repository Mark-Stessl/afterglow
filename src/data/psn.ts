/** PlayStation sync through the worker: trophies and playtime for PS5/PS4/PS3/Vita. Tokens stay in this browser. */
import * as Lookup from './lookup';
import { store } from './store';
import { syncPlatinum } from './trophies';
import type { Item, Tier, Trophy } from './types';
import { fail, lsJSON, lsMerge, workerFetch, type CodedError } from './worker';

const KEY = 'afterglow.psn';
interface PsnState { accessToken: string; expiresAt: number; refreshToken: string; refreshExpiresAt: number; lastSync: string }
interface PsnTitle { id: string; service: string; name: string; platform?: string; progress?: number; icon?: string; updated?: string }
interface PsnTrophy { id: number; name?: string; desc?: string; type: Tier; rate?: number; earned?: boolean; earnedAt?: string; group?: string }
interface PsnPlay { name: string; minutes: number | null; lastPlayed?: string }

const state = () => lsJSON<PsnState>(KEY);
const save = (p: Partial<PsnState>) => lsMerge<PsnState>(KEY, p);
let titleCache: PsnTitle[] | null = null;

export const connected = () => { const s = state(); return !!(s.refreshToken && (s.refreshExpiresAt || 0) > Date.now()); };
export const lastSync = () => state().lastSync || null;

/** Sign in with the NPSSO code (raw or the JSON Sony shows). */
export async function connect(npsso: string) {
  let raw = (npsso || '').trim();
  try { const j = JSON.parse(raw); if (j.npsso) raw = j.npsso; } catch { /* plain code */ }
  const tokens = await workerFetch<PsnState>('/auth', { method: 'POST', body: { npsso: raw } });
  save(tokens);
  titleCache = null;
}

export function disconnect() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  titleCache = null;
}

async function token() {
  const s = state();
  if (s.accessToken && (s.expiresAt || 0) > Date.now() + 60000) return s.accessToken;
  if (!s.refreshToken || (s.refreshExpiresAt || 0) < Date.now()) throw fail('expired', 'Sign-in expired');
  const t = await workerFetch<PsnState>('/refresh', { method: 'POST', body: { refreshToken: s.refreshToken } }).catch(e => { throw fail('expired', e.message); });
  save(t);
  return t.accessToken;
}

async function api<T>(path: string): Promise<T> {
  try { return await workerFetch<T>(path, { token: await token() }); }
  catch (e) {
    if ((e as CodedError).code === 'token_expired') { save({ expiresAt: 0 }); return workerFetch<T>(path, { token: await token() }); }
    throw e;
  }
}

async function titles(force = false) {
  if (titleCache && !force) return titleCache;
  titleCache = (await api<{ titles: PsnTitle[] }>('/titles')).titles || [];
  return titleCache;
}

async function trophies(title: PsnTitle): Promise<Trophy[]> {
  const list = (await api<{ trophies: PsnTrophy[] }>(`/trophies?id=${encodeURIComponent(title.id)}&service=${encodeURIComponent(title.service)}`)).trophies || [];
  return list.map(t => ({
    id: `psn-${title.id}-${t.id}`,
    name: t.name || 'Hidden trophy',
    desc: t.desc || '',
    tier: (['bronze', 'silver', 'gold', 'platinum'] as Tier[]).includes(t.type) ? t.type : 'bronze',
    rarity: t.rate,
    done: !!t.earned,
    doneAt: t.earned ? (t.earnedAt || new Date().toISOString()) : null,
    dlc: t.group && t.group !== 'default' ? true : undefined,
  }));
}

const norm = (s?: string) => (s || '').toLowerCase()
  .replace(/[™®©]/g, '').replace(/\b(trophies|trophäen|ps4|ps5|playstation ?[45]|edition|remastered|digital deluxe)\b/g, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const cleanName = (s: string) => s.replace(/[™®]/g, '').replace(/\s+trophies$/i, '').replace(/\s{2,}/g, ' ').trim();
function platformOf(t: PsnTitle) {
  const p = (t.platform || '').toUpperCase();
  if (p.includes('PS5')) return 'PS5';
  if (p.includes('PS4')) return 'PS4';
  if (p.includes('PS3')) return 'PS3';
  if (p.includes('VITA')) return 'PS Vita';
  return 'PS5';
}

function findTitle(name: string, list: PsnTitle[]) {
  const n = norm(name);
  if (!n) return null;
  const exact = list.filter(t => norm(t.name) === n);
  const loose = exact.length ? exact : list.filter(t => { const m = norm(t.name); return m.length > 3 && (m.startsWith(n) || n.startsWith(m)); });
  return loose.sort((a, b) => (b.progress || 0) - (a.progress || 0) || (platformOf(a) === 'PS5' ? -1 : 1))[0] || null;
}

export async function trophiesFor(name: string) {
  const t = findTitle(name, await titles());
  return t ? { title: t, trophies: await trophies(t), platform: platformOf(t) } : null;
}

function applyToItem(item: Item, t: PsnTitle, list: Trophy[]) {
  syncPlatinum(list);
  const plat = list.find(x => x.tier === 'platinum');
  const patch: Partial<Item> = { trophies: list, trophySource: 'psn', psnId: t.id, psnService: t.service };
  if ((plat && plat.done) || (!plat && list.length && list.every(x => x.done))) {
    patch.status = 'done';
    patch.finishedAt = plat?.doneAt || list.map(x => x.doneAt).filter(Boolean).sort().pop() || item.finishedAt || null;
  }
  return store.update(item.id, patch);
}

async function playtimes(): Promise<PsnPlay[]> {
  try { return (await api<{ titles: PsnPlay[] }>('/playtime')).titles || []; }
  catch (e) { if ((e as CodedError).code === 'expired') throw e; return []; }
}
function applyPlaytime(item: Item, list: PsnPlay[]) {
  const n = norm(item.title);
  const hits = list.filter(p => p.minutes != null && norm(p.name) === n);
  if (!hits.length) return;
  const minutes = hits.reduce((a, p) => a + (p.minutes || 0), 0); // PS4 and PS5 versions together
  const last = hits.map(p => p.lastPlayed).filter(Boolean).sort().pop() || null;
  const cur = store.get(item.id);
  if (cur && (cur.playMin !== minutes || cur.lastPlayed !== last)) store.update(item.id, { playMin: minutes, playSrc: 'psn', lastPlayed: last });
}

/** Bring in every PlayStation game with its trophies; new games get details from Wikipedia. */
export async function syncAll({ onProgress, enrich = true }: { onProgress?: (p: { i: number; total: number; name: string }) => void; enrich?: boolean } = {}) {
  const all = await titles(true);
  const play = await playtimes();
  const groups = new Map<string, PsnTitle>();
  all.forEach(t => {
    const k = norm(t.name), cur = groups.get(k);
    if (!cur || (t.progress || 0) > (cur.progress || 0) || ((t.progress || 0) === (cur.progress || 0) && platformOf(t) === 'PS5')) groups.set(k, t);
  });
  const list = [...groups.values()];
  const result = { added: 0, updated: 0, earned: 0, failed: 0, total: list.length };
  const games = store.all('game');
  let i = 0;
  for (const t of list) {
    i++;
    const name = cleanName(t.name);
    onProgress?.({ i, total: list.length, name });
    try {
      const trophyList = await trophies(t);
      result.earned += trophyList.filter(x => x.done).length;
      let item = games.find(g => g.psnId === t.id) || games.find(g => norm(g.title) === norm(t.name));
      if (item) {
        applyToItem(item, t, trophyList);
        applyPlaytime(item, play);
        result.updated++;
      } else {
        const recent = t.updated && (Date.now() - Date.parse(t.updated)) < 30 * 864e5;
        const data: Partial<Item> = { type: 'game', title: name, platform: platformOf(t), genre: 'other', status: recent ? 'active' : 'done', rating: 0, notes: '', cover: t.icon || '', year: null, trophies: [] };
        if (enrich) {
          try {
            const hits = await Lookup.search('game', name);
            const hit = hits.find(h => norm(h.title) === norm(name));
            if (hit) {
              const d = await Lookup.detail('game', hit);
              if (d.cover) data.cover = d.cover;
              if (d.year) data.year = d.year;
              if (d.genre) data.genre = d.genre;
              if (d.genres) data.genres = d.genres;
              if (d.released) data.released = d.released;
              if (d.external) data.external = d.external;
            }
          } catch { /* details are a bonus */ }
        }
        item = store.add(data as Item);
        games.push(item);
        applyToItem(item, t, trophyList);
        applyPlaytime(item, play);
        result.added++;
      }
    } catch (e) {
      if (['expired', 'no_worker'].includes((e as CodedError).code)) throw e;
      result.failed++;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  save({ lastSync: new Date().toISOString() });
  return result;
}

export async function syncOne(item: Item) {
  const all = await titles();
  const t = (item.psnId && all.find(x => x.id === item.psnId)) || findTitle(item.title, all);
  if (!t) return null;
  const list = await trophies(t);
  applyToItem(item, t, list);
  applyPlaytime(item, await playtimes());
  return list;
}
