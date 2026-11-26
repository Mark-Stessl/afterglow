/** Find better (portrait) covers for games in the background: Steam store art first, then Wikipedia box art. */
import * as Lookup from './lookup';
import * as Steam from './steam';
import { store } from './store';
import { enabled as syncEnabled } from './sync';

/** Version of the cover search: older items get one retry with the newer search. */
export const COVER_V = 2;
const queue: string[] = [];
let busy = false;
const norm = (t?: string) => (t || '').toLowerCase().replace(/[-–]?\s*troph(ä|ae)en$/i, '').replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, '');
const ratio = (src: string) => new Promise<number | null>(res => {
  const i = new Image();
  i.onload = () => res(i.naturalWidth / i.naturalHeight);
  i.onerror = () => res(null);
  i.src = src;
});

export function queueCover(id: string) {
  const it = store.get(id);
  if (it && it.type === 'game' && !it.coverCustom && (it.coverV || 0) < COVER_V && !queue.includes(id)) { queue.push(id); run(); }
}

async function run() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const id = queue.shift()!, it = store.get(id);
    if (!it || (it.coverV || 0) >= COVER_V) continue;
    let better: string | null = null;
    const q = it.title.replace(/[-–]?\s*Troph(ä|ae)en$/i, '').replace(/[™®©]/g, '').trim();
    if (syncEnabled()) { // the Steam search needs the worker key
      try {
        const hit = it.steamAppId ? { appid: it.steamAppId } : await Steam.find(q);
        if (hit) { const c = await Steam.cover(hit.appid); const r = c.portrait ? await ratio(c.portrait) : null; if (r && r < 0.85) better = c.portrait!; }
      } catch { /* try Wikipedia */ }
    }
    if (!better) {
      try {
        const want = norm(q), short = norm(q.split(':')[0]);
        const hits = await Lookup.search('game', q);
        const hit = hits.find(h => h.cover && norm(h.title) === want) || hits.find(h => h.cover && norm(h.title.split(':')[0]) === short && short.length >= 4);
        if (hit) { const r = await ratio(hit.cover); if (r && r < 0.85) better = hit.cover; }
      } catch { /* keep the current cover */ }
    }
    store.update(id, better ? { cover: better, coverTried: true, coverV: COVER_V } : { coverTried: true, coverV: COVER_V });
    await new Promise(r => setTimeout(r, 300));
  }
  busy = false;
}
