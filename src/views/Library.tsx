import { useState } from 'react';
import { PLATFORM_GROUPS, STATUS, TYPES, familyOf } from '../data/constants';
import { hoursOf, newCount, showsNew } from '../data/items';
import { store, useStoreVersion } from '../data/store';
import { progress } from '../data/trophies';
import type { Item, ItemType, Status } from '../data/types';
import { CinemaScreen } from '../components/CinemaScreen';
import { CONSOLE_KEYS, ConsoleBoard, consoleOf, type ConsoleKey } from '../components/GameRoom';
import { ItemCard } from '../components/ItemCard';
import { RoomArt } from '../components/RoomArt';
import type { Room } from '../rooms';
import { href } from '../router';
import { Chip, Plus, SearchIcon, btn, cn, input } from '../ui/kit';
import { AddSheet } from './AddSheet';

type Sort = 'added' | 'title' | 'rating' | 'progress' | 'playtime';
interface LibState { type: ItemType; status: Status | 'all' | 'new'; q: string; sort: Sort; family: string }

/** Filters survive leaving the room and coming back (until reload). */
const memory = new Map<string, LibState>();

const SORTS: [Sort, string][] = [['added', 'Recently added'], ['title', 'Title A–Z'], ['rating', 'Best rated']];
const GAME_SORTS: [Sort, string][] = [['progress', 'Trophy progress'], ['playtime', 'Most played']];

const EMPTY: Record<ItemType, [string, string]> = {
  movie: ['The cinema is empty', 'Add the movies you have seen or want to see, with a rating.'],
  game: ['No games on the shelf yet', 'Add a game and tick off its trophies, or sync PlayStation and Steam under Data.'],
  series: ['No series yet', 'Add a series; seasons and episodes come in automatically from TVmaze.'],
  anime: ['No anime yet', 'Add an anime; all its seasons and movies come in from AniList.'],
  manga: ['No manga yet', 'Add a manga; the latest chapter count comes from MangaDex.'],
};

function sorter(sort: Sort) {
  const hrs = (i: Item) => (hoursOf(i) || 0) > 0 ? hoursOf(i)! : null;
  const prog = (i: Item) => { const p = progress(i.trophies); return p.total ? p.done / p.total : -1; };
  const fns: Record<Sort, (a: Item, b: Item) => number> = {
    added: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''),
    title: (a, b) => a.title.localeCompare(b.title, 'en'),
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    progress: (a, b) => prog(b) - prog(a),
    playtime: (a, b) => Number(hrs(a) == null) - Number(hrs(b) == null) || (hrs(b) || 0) - (hrs(a) || 0),
  };
  return fns[sort];
}

/** Cinema: the screen above the list plays the movie touched last. */
function NowShowing({ items }: { items: Item[] }) {
  const pick = items.filter(i => i.status !== 'dropped').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
  return (
    <div className="mt-6">
      {pick ? (
        <a href={href('item', pick.id)} aria-label={`Now showing: ${pick.title}`} className="block rounded-xl no-underline">
          <CinemaScreen key={pick.id} item={pick} compact caption={<>Now showing · <span className="text-text">{pick.title}</span></>} />
        </a>
      ) : (
        <CinemaScreen compact caption="Nothing showing yet" />
      )}
    </div>
  );
}

export function Library({ room }: { room: Room }) {
  useStoreVersion();
  const [s, setS] = useState<LibState>(() => memory.get(room.id) || { type: room.types[0], status: 'all', q: '', sort: 'added', family: 'all' });
  const set = (p: Partial<LibState>) => setS(prev => { const next = { ...prev, ...p }; memory.set(room.id, next); return next; });
  const [adding, setAdding] = useState(false);

  const type = room.types.includes(s.type) ? s.type : room.types[0];
  const items = store.all(type);
  // game room: the consoles on the board pick the platform (kept in `family`)
  const consoleKey: ConsoleKey = type === 'game' && (CONSOLE_KEYS as string[]).includes(s.family) ? s.family as ConsoleKey : 'all';
  const families = type === 'game' ? [] : PLATFORM_GROUPS.map(([g]) => g).filter(g => items.some(i => familyOf(i.platform) === g));
  const family = families.includes(s.family) ? s.family : 'all';
  const statuses = Object.entries(STATUS[type]) as [Status, string][];
  const newOnes = items.filter(showsNew);

  const list = items
    .filter(i => s.status === 'all' || (s.status === 'new' ? showsNew(i) : i.status === s.status))
    .filter(i => family === 'all' || familyOf(i.platform) === family)
    .filter(i => consoleKey === 'all' || consoleOf(i) === consoleKey)
    .filter(i => !s.q || i.title.toLowerCase().includes(s.q.trim().toLowerCase()))
    .sort(sorter(type !== 'game' && (s.sort === 'progress' || s.sort === 'playtime') ? 'added' : s.sort));

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-6 pb-28 md:pb-12">
      <a href={href()} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted no-underline hover:text-text">
        <span aria-hidden="true">←</span> Building
      </a>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <span aria-hidden="true" className="relative hidden h-12 w-20 shrink-0 sm:block" style={{ color: room.light }}><RoomArt id={room.id} /></span>
          <div>
            <h1 className="m-0 text-3xl font-bold">{room.name}</h1>
            <p className="m-0 mt-1 text-muted">
              {room.types.map(t => `${store.all(t).length.toLocaleString('en')} ${TYPES[t].plural.toLowerCase()}`).join(' · ')}
            </p>
          </div>
        </div>
        <button type="button" className={btn.primary} onClick={() => setAdding(true)}><Plus /> Add {TYPES[type].label.toLowerCase()}</button>
      </header>

      {room.id === 'cinema' && <NowShowing items={items} />}
      {room.id === 'games' && <ConsoleBoard items={items} value={consoleKey} onPick={k => set({ family: k })} />}

      {room.types.length > 1 && (
        <div role="tablist" aria-label="Channel" className="mt-6 inline-flex rounded-xl border border-line bg-surface p-1">
          {room.types.map(t => (
            <button key={t} type="button" role="tab" aria-selected={t === type}
              onClick={() => set({ type: t, status: 'all' })}
              className={cn('min-h-10 cursor-pointer rounded-lg px-5 text-sm font-semibold transition-colors', t === type ? 'text-ink' : 'text-muted hover:text-text')}
              style={t === type ? { background: room.light } : undefined}>
              {TYPES[t].plural}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-0 flex-1 basis-56">
              <span className="sr-only">Search {TYPES[type].plural}</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
              <input type="search" value={s.q} onChange={e => set({ q: e.target.value })} placeholder="Search" className={cn(input, 'pl-10')} />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="sr-only sm:not-sr-only">Sort</span>
              <select value={s.sort} onChange={e => set({ sort: e.target.value as Sort })} className={cn(input, 'w-auto cursor-pointer pr-8')}>
                {[...SORTS, ...(type === 'game' ? GAME_SORTS : [])].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            <Chip on={s.status === 'all'} onClick={() => set({ status: 'all' })} count={items.length}>All</Chip>
            {newOnes.length > 0 && <Chip on={s.status === 'new'} onClick={() => set({ status: 'new' })} count={newOnes.reduce((a, i) => a + newCount(i), 0)}>New</Chip>}
            {statuses.map(([k, l]) => {
              const c = items.filter(i => i.status === k).length;
              return c ? <Chip key={k} on={s.status === k} onClick={() => set({ status: k })} count={c}>{l}</Chip> : null;
            })}
            {families.length > 1 && <span aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-line" />}
            {families.length > 1 && families.map(f => (
              <Chip key={f} on={family === f} onClick={() => set({ family: family === f ? 'all' : f })}>{f}</Chip>
            ))}
          </div>
        </div>
      )}

      {!items.length ? (
        <div className="mt-10 rounded-xl border border-dashed border-line px-6 py-14 text-center">
          <p className="m-0 font-display text-lg text-text">{EMPTY[type][0]}</p>
          <p className="m-0 mx-auto mt-2 max-w-sm text-sm text-muted">{EMPTY[type][1]}</p>
          <button type="button" className={cn(btn.primary, 'mt-5')} onClick={() => setAdding(true)}><Plus /> Add {TYPES[type].label.toLowerCase()}</button>
        </div>
      ) : !list.length ? (
        <p className="mt-10 text-center text-sm text-muted">
          Nothing here{s.q ? ` for “${s.q}”` : ''}.{' '}
          <button type="button" className="cursor-pointer text-amber underline-offset-2 hover:underline" onClick={() => set({ q: '', status: 'all', family: 'all' })}>Clear filters</button>
        </p>
      ) : (
        <ul className="m-0 mt-6 grid list-none grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-x-4 gap-y-6 p-0 sm:grid-cols-[repeat(auto-fill,minmax(148px,1fr))] sm:gap-x-6">
          {list.map(it => <li key={it.id} className="min-w-0"><ItemCard item={it} light={room.light} /></li>)}
        </ul>
      )}

      <AddSheet open={adding} type={type} onClose={() => setAdding(false)} />
    </section>
  );
}

