/**
 * Steam achievements through the worker (official Steam Web API, own key stored only on the worker).
 * Steam has no tiers: the tier comes from rarity, platinum is "all achievements".
 */
import { store } from './store';
import { progress } from './trophies';
import type { Item, Trophy } from './types';
import { lsJSON, workerFetch } from './worker';

const KEY = 'afterglow.steam';
interface SteamState { connected: boolean; steamid: string; name: string }
interface Achievement { api: string; name: string; desc?: string; hidden?: boolean; rarity?: number | null; icon?: string; done?: boolean; doneAt?: string }
interface AchievementsResult { achievements: Achievement[]; cover?: string; playMinutes?: number | null; lastPlayed?: string | null }

let state = lsJSON<SteamState>(KEY);
const save = (s: Partial<SteamState>) => { state = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const call = <T,>(path: string, body?: unknown) => workerFetch<T>(path, body === undefined ? {} : { method: 'POST', body });

export const connected = () => !!state.connected;
export const profile = () => state.name || null;
export const hasProfile = () => !!state.steamid;

export async function refresh() { try { save(await call<SteamState>('/steam/status')); } catch { /* offline */ } return state; }
export async function connect(apiKey: string, prof?: string) {
  const r = await call<{ steamid: string; name: string }>('/steam/connect', { apiKey, profile: prof || undefined });
  save({ connected: true, steamid: r.steamid, name: r.name });
  return r;
}
export async function disconnect() { await call('/steam/disconnect', {}).catch(() => {}); save({}); }

const norm = (s?: string) => (s || '').toLowerCase().replace(/[™®©]/g, '').replace(/[-–]?\s*(troph(ä|ae)en|achievements)$/i, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

/** Find a game in the Steam store: exact name first, then the part before the colon. */
export async function find(title: string) {
  const { results } = await call<{ results: { appid: number; name: string }[] }>(`/steam/search?q=${encodeURIComponent(title)}`);
  const want = norm(title), short = norm(title.split(':')[0]);
  return results.find(r => norm(r.name) === want) || results.find(r => norm(r.name.split(':')[0]) === short && short.length >= 4) || null;
}

const tierOf = (r?: number | null) => r == null ? 'bronze' : r <= 5 ? 'gold' : r <= 20 ? 'silver' : 'bronze';

export function toTrophies(appid: number, list: Achievement[], previous: Trophy[] = []): Trophy[] {
  const prev = new Map(previous.map(t => [t.id, t]));
  const out: Trophy[] = list.map(a => {
    const id = `steam-${appid}-${a.api}`;
    const old = prev.get(id);
    const done = !!a.done || (!state.steamid && !!old?.done); // without a profile: keep own ticks
    return {
      id, name: a.name, desc: a.desc || (a.hidden ? 'Hidden achievement' : ''), tier: tierOf(a.rarity), rarity: a.rarity, icon: a.icon || undefined,
      done, doneAt: done ? (a.doneAt || old?.doneAt || new Date().toISOString()) : null,
    };
  });
  if (out.length) {
    const pid = `steam-${appid}-platinum`;
    const last = out.map(t => t.doneAt).filter(Boolean).sort().pop() || null;
    const all = out.every(t => t.done);
    out.unshift({ id: pid, name: 'All achievements', desc: 'Every Steam achievement of this game unlocked', tier: 'platinum', rarity: null, done: all, doneAt: all ? (prev.get(pid)?.doneAt || last) : null });
  }
  return out;
}

export const achievementsFor = (appid: number) => call<AchievementsResult>(`/steam/achievements?appid=${appid}`);
export const cover = (appid: number) => call<{ portrait?: string }>(`/steam/cover?appid=${appid}`);

/** Patch for a game: achievements, app id, portrait cover, playtime, done at 100%. */
export function patchFor(item: Item, appid: number, res: AchievementsResult): Partial<Item> {
  const trophies = toTrophies(appid, res.achievements, item.trophies || []);
  const patch: Partial<Item> = { trophies, trophySource: 'steam', steamAppId: appid };
  if (res.playMinutes != null) Object.assign(patch, { playMin: res.playMinutes, playSrc: 'steam', lastPlayed: res.lastPlayed || null });
  if (res.cover) Object.assign(patch, { cover: res.cover, coverTried: true, coverV: 2 });
  const plat = trophies.find(t => t.tier === 'platinum');
  if (plat?.done) { patch.status = 'done'; patch.finishedAt = plat.doneAt || item.finishedAt || null; }
  return patch;
}

/** Bring in or update every Steam game you have played. */
export async function syncAll({ onProgress }: { onProgress?: (i: number, total: number, name: string) => void } = {}) {
  const { games } = await call<{ games: { appid: number; name: string; minutes: number; lastPlayed?: string }[] }>('/steam/games');
  const played = games.filter(g => g.minutes > 0).sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''));
  const result = { added: 0, updated: 0, earned: 0, failed: 0, total: played.length };
  let i = 0;
  for (const g of played) {
    i++;
    onProgress?.(i, played.length, g.name);
    const mine = store.all('game');
    const existing = mine.find(x => x.steamAppId === g.appid) || mine.find(x => norm(x.title) === norm(g.name) && (x.platform === 'Steam' || !x.platform));
    try {
      const res = { ...(await achievementsFor(g.appid)), playMinutes: g.minutes, lastPlayed: g.lastPlayed };
      const before = existing ? progress(existing.trophies).done : 0;
      let id = existing?.id;
      if (existing) {
        store.update(existing.id, patchFor(existing, g.appid, res));
        result.updated++;
      } else {
        const created = store.add({ type: 'game', title: g.name, platform: 'Steam', genre: 'other', status: 'active', cover: '', year: null });
        store.update(created.id, patchFor(created, g.appid, res));
        id = created.id;
        result.added++;
      }
      result.earned += Math.max(0, progress(store.get(id!)?.trophies).done - before);
    } catch { result.failed++; }
    await new Promise(r => setTimeout(r, 250));
  }
  return result;
}
