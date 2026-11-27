import { useEffect, useRef, useState } from 'react';
import { PLATFORM_GROUPS, STATUS, TYPES } from '../data/constants';
import * as Lookup from '../data/lookup';
import { store, uid } from '../data/store';
import { queueCover } from '../data/covers';
import type { Item, ItemType, NewItem, Status } from '../data/types';
import { Cover } from '../components/Cover';
import { href } from '../router';
import { checkNewItem } from '../news';
import { Chip, SearchIcon, Sheet, btn, cn, input, toast } from '../ui/kit';

type Draft = NewItem & { platforms?: string[] };

const DEFAULT_STATUS: Record<ItemType, Status> = { movie: 'done', game: 'active', series: 'active', anime: 'active', manga: 'active' };

function blank(type: ItemType, title: string): Draft {
  return { type, title: title.trim(), status: DEFAULT_STATUS[type], rating: 0, notes: '', cover: '', year: null, ...(type === 'game' ? { platform: 'PS5', genre: 'other' } : {}) };
}

/** Search the right source for the type, pick a result, check the details, add. */
export function AddSheet({ open, type, onClose }: { open: boolean; type: ItemType; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Lookup.Hit[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'error' | 'nokey' | 'loading'>('idle');
  const [draft, setDraft] = useState<Draft | null>(null);
  const seq = useRef(0);

  useEffect(() => { if (!open) { setQ(''); setHits([]); setDraft(null); setState('idle'); } }, [open]);

  useEffect(() => {
    if (!open || draft) return;
    const term = q.trim();
    if (term.length < 2) { setHits([]); setState('idle'); return; }
    if (!Lookup.hasKey(type)) { setState('nokey'); return; }
    const n = ++seq.current;
    setState('searching');
    const t = setTimeout(async () => {
      try {
        const r = await Lookup.search(type, term);
        if (n === seq.current) { setHits(r); setState('idle'); }
      } catch { if (n === seq.current) { setHits([]); setState('error'); } }
    }, 350);
    return () => clearTimeout(t);
  }, [q, type, open, draft]);

  async function pick(hit: Lookup.Hit) {
    setState('loading');
    const d = blank(type, hit.title);
    try {
      const det = await Lookup.detail(type, hit);
      const { latest, completed: _c, platforms, ...rest } = det;
      Object.assign(d, Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null && v !== '')));
      if (type === 'game' && platforms?.length) { d.platforms = platforms; d.platform = platforms.includes('PS5') ? 'PS5' : platforms[0]; }
      if (type === 'manga') { d.chapters = latest || null; d.chaptersRead = 0; }
      if (type === 'anime' && det.anilistId) {
        try {
          const seasons = await Lookup.animeSeasons(det.anilistId);
          if (seasons.length) d.seasonList = seasons.map(x => ({ ...x, id: uid(), seen: 0 }));
        } catch { /* one season is fine */ }
      }
    } catch {
      toast('Details could not be loaded', 'Added with what the search found');
    }
    if (!d.cover) d.cover = hit.cover;
    if (!d.year) d.year = hit.year;
    setDraft(d);
    setState('idle');
  }

  function add() {
    if (!draft) return;
    const { platforms: _p, ...data } = draft;
    const it = store.add(data as Item);
    if (it.type === 'game') queueCover(it.id);
    if (it.type === 'anime' || it.type === 'series') checkNewItem(it.id);
    onClose();
    toast(`${it.title} added`, TYPES[it.type].label);
    location.hash = href('item', it.id);
  }

  const status = draft ? (Object.entries(STATUS[type]) as [Status, string][]) : [];

  return (
    <Sheet open={open} onClose={onClose} title={draft ? `Add ${TYPES[type].label.toLowerCase()}` : `Find ${/^[aeiou]/i.test(TYPES[type].label) ? 'an' : 'a'} ${TYPES[type].label.toLowerCase()}`}>
      {!draft ? (
        <div>
          <label className="relative block">
            <span className="sr-only">Title</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
            <input data-autofocus type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Title" className={cn(input, 'pl-10')} />
          </label>

          <div className="mt-3 min-h-40" aria-live="polite">
            {state === 'nokey' && (
              <p className="m-0 rounded-lg border border-line p-4 text-sm text-muted">
                Movie search needs a free TMDB key. Add it under <a className="text-amber" href={href('data')} onClick={onClose}>Data</a>, or add the movie by hand below.
              </p>
            )}
            {state === 'error' && <p className="m-0 p-2 text-sm text-muted">The search is not reachable right now. You can add it by hand.</p>}
            {state === 'loading' && <p className="m-0 p-2 text-sm text-muted">Loading details…</p>}
            {state !== 'loading' && hits.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {hits.map(h => (
                  <li key={String(h.id)}>
                    <button type="button" onClick={() => pick(h)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-raised">
                      <span className="h-16 w-11 shrink-0 overflow-hidden rounded bg-raised">
                        {h.thumb && <img src={h.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-text">{h.title}</span>
                        <span className="block truncate text-[13px] text-muted">{h.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {state === 'searching' && !hits.length && <p className="m-0 p-2 text-sm text-muted">Searching…</p>}
            {state === 'idle' && q.trim().length >= 2 && !hits.length && <p className="m-0 p-2 text-sm text-muted">Nothing found.</p>}
          </div>

          {q.trim().length >= 1 && state !== 'loading' && (
            <button type="button" className={cn(btn.secondary, 'mt-3 w-full')} onClick={() => setDraft(blank(type, q))}>
              Add “{q.trim()}” by hand
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="w-24 shrink-0"><Cover item={{ ...(draft as Item), id: 'draft', addedAt: '', updatedAt: '' }} /></div>
            <div className="min-w-0 flex-1">
              <label className="block text-xs text-muted" htmlFor="add-title">Title</label>
              <input id="add-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={cn(input, 'mt-1')} />
              <p className="m-0 mt-2 text-[13px] text-muted">
                {[draft.year, draft.genres?.slice(0, 3).join(', '), draft.seasonList?.length ? `${draft.seasonList.length} seasons and movies` : '', draft.chapters ? `${draft.chapters} chapters` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          {type === 'game' && (
            <label className="block">
              <span className="text-xs text-muted">Platform</span>
              <select value={draft.platform} onChange={e => setDraft({ ...draft, platform: e.target.value })} className={cn(input, 'mt-1 cursor-pointer')}>
                {PLATFORM_GROUPS.map(([g, list]) => (
                  <optgroup key={g} label={g}>
                    {list.filter(p => p !== 'Andere').map(p => <option key={p} value={p}>{p}{draft.platforms?.includes(p) ? ' ·' : ''}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          <div>
            <span className="text-xs text-muted">Status</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {status.map(([k, l]) => <Chip key={k} on={draft.status === k} onClick={() => setDraft({ ...draft, status: k })}>{l}</Chip>)}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" className={cn(btn.ghost, 'flex-1')} onClick={() => setDraft(null)}>Back</button>
            <button type="button" className={cn(btn.primary, 'flex-[2]')} disabled={!draft.title.trim()} onClick={add}>Add</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
