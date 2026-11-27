import { useEffect, useState } from 'react';
import { STATUS, TYPES } from '../data/constants';
import {
  currentSeason, epTotal, hoursOf, materialize, parseHours, plusOne, plusOneLabel, released, releaseInfo, saveManga, saveSeasons, seasonDone, seasonsOf,
} from '../data/items';
import { store, useStoreVersion } from '../data/store';
import type { Item, Season, Status } from '../data/types';
import { CinemaScreen } from '../components/CinemaScreen';
import { Cover } from '../components/Cover';
import { GameStage } from '../components/GameRoom';
import { LivingScene, Sideboard, Tv } from '../components/LivingTv';
import { OpenBook } from '../components/ReadingNook';
import { ROOMS } from '../rooms';
import { href } from '../router';
import { Chip, Sheet, Stars, btn, cn, input, toast } from '../ui/kit';
import { TrophySection } from './Trophies';

const roomOf = (it: Item) => ROOMS.find(r => r.types.includes(it.type))!;
const fmtDate = (d: string) => new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function Stepper({ value, max, onChange, label }: { value: number; max?: number | null; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className={cn(btn.secondary, 'min-h-10 w-10 px-0 text-lg')} aria-label={`One less (${label})`} disabled={value <= 0} onClick={() => onChange(value - 1)}>−</button>
      <span className="min-w-[4.5rem] text-center text-[15px] font-semibold tabular-nums">{value}{max ? <span className="font-normal text-muted"> / {max}</span> : null}</span>
      <button type="button" className={cn(btn.secondary, 'min-h-10 w-10 px-0 text-lg')} aria-label={`One more (${label})`} disabled={!!max && value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function Seasons({ item, light }: { item: Item; light: string }) {
  const list = seasonsOf(item);
  const edit = (i: number, patch: Partial<Season>) => {
    const next = materialize(item);
    Object.assign(next[i], patch);
    saveSeasons(item, next);
  };
  // the season you are on is "On now" in the guide
  const now = list.every(seasonDone) ? null : currentSeason(item)?.id;
  const shows = list.filter(x => x.format !== 'MOVIE');
  const movies = list.filter(x => x.format === 'MOVIE');
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold">TV guide</h2>
        <span className="text-[13px] text-muted">{item.type === 'anime' ? 'Seasons and movies' : 'Seasons'}</span>
      </div>
      <ul className="m-0 mt-3 list-none overflow-hidden rounded-xl border border-line bg-surface p-0">
        {list.map((x, i) => {
          const done = seasonDone(x);
          const max = epTotal(x);
          const out = released(x);
          const behind = x.aired != null && max && out < max ? `${out} out` : '';
          const on = x.id === now;
          const slot = x.format === 'MOVIE' ? `M${movies.length > 1 ? movies.indexOf(x) + 1 : ''}` : `S${shows.indexOf(x) + 1}`;
          return (
            <li key={x.id} className={cn('grid grid-cols-[3.25rem_1fr] border-t border-line first:border-t-0 sm:grid-cols-[4rem_1fr]', on && 'bg-raised')}>
              <div className="flex items-center justify-center border-r border-line font-display text-lg font-semibold tabular-nums"
                style={{ color: on || done ? light : 'var(--color-muted)', boxShadow: on ? `inset 3px 0 0 ${light}` : undefined }}>{slot}</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-44">
                <div className="flex items-center gap-2 font-semibold">
                  {x.label}
                  {on && <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-ink" style={{ background: light }}>On now</span>}
                  {done && <span className="sr-only">(seen)</span>}
                  {x.airing === 'RELEASING' && <span className="rounded bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-muted">Airing</span>}
                </div>
                {(x.title && x.title !== item.title) || x.year || behind ? (
                  <div className="truncate text-[13px] text-muted">{[x.title !== item.title ? x.title : '', x.year, behind].filter(Boolean).join(' · ')}</div>
                ) : null}
              </div>
              {x.format === 'MOVIE' || (!max && item.type === 'series' && !item.seasonList?.length) ? (
                <Chip on={done} onClick={() => edit(i, { complete: !done, seen: !done ? (x.episodes || 1) : 0 })}>{done ? 'Seen' : 'Mark seen'}</Chip>
              ) : (
                <Stepper label={`${x.label} episodes`} value={x.seen || 0} max={max} onChange={n => edit(i, { seen: n, complete: !!max && n >= max })} />
              )}
            </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Manga({ item }: { item: Item }) {
  const read = Math.floor(item.chaptersRead || 0);
  return (
    <section className="mt-10">
      <h2 className="m-0 text-xl font-semibold">Chapters</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="text-sm text-muted">
          {item.chapters ? `${Math.max(0, Math.floor(item.chapters) - read)} left` : 'Total unknown'}
          {item.mdStatus && ` · ${item.mdStatus}`}
        </div>
        <Stepper label="Chapters read" value={read} max={item.chapters ? Math.floor(item.chapters) : null} onChange={n => saveManga(item, { chaptersRead: n })} />
      </div>
    </section>
  );
}

function Playtime({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const h = hoursOf(item);
  const src = item.playH != null ? 'Entered by you' : item.playSrc === 'steam' ? 'From Steam' : item.playSrc === 'psn' ? 'From PlayStation' : '';
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <div>
        <div className="font-display text-2xl font-semibold tabular-nums">{h != null ? (h < 1 && h > 0 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.round(h).toLocaleString('en')} h`) : '—'}</div>
        <div className="text-[13px] text-muted">{h != null ? src : 'No playtime yet'}</div>
      </div>
      <div className="flex gap-2">
        {h != null && <button type="button" className={cn(btn.secondary, btn.small)} onClick={() => store.update(item.id, { playH: Math.round(((item.playH ?? Math.round(h)) + 1) * 10) / 10 })}>+1 h</button>}
        <button type="button" className={cn(btn.secondary, btn.small)} onClick={() => { setVal(h != null ? String(Math.round(h * 10) / 10) : ''); setOpen(true); }}>{h != null ? 'Change' : 'Enter'}</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Playtime">
        <form onSubmit={e => {
          e.preventDefault();
          const n = parseHours(val);
          if (n === undefined) { toast('That is not a number of hours'); return; }
          store.update(item.id, { playH: n });
          setOpen(false);
        }}>
          <label className="block"><span className="text-xs text-muted">Hours (empty: use the automatic value)</span>
            <input data-autofocus inputMode="decimal" value={val} onChange={e => setVal(e.target.value)} className={cn(input, 'mt-1')} placeholder="e.g. 42.5" /></label>
          <button type="submit" className={cn(btn.primary, 'mt-4 w-full')}>Save</button>
        </form>
      </Sheet>
    </div>
  );
}

export function Detail({ id }: { id: string }) {
  useStoreVersion();
  const item = store.get(id);
  const [notes, setNotes] = useState(item?.notes || '');
  useEffect(() => { setNotes(store.get(id)?.notes || ''); }, [id]);
  useEffect(() => { if (item) document.title = `${item.title} · Afterglow`; }, [item]);

  if (!item) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="font-display text-lg">This item is gone.</p>
        <a href={href()} className={cn(btn.secondary, 'mt-4 no-underline')}>Back to the building</a>
      </section>
    );
  }

  const room = roomOf(item);
  const plus = plusOneLabel(item);
  const rel = releaseInfo(item);
  const meta = [TYPES[item.type].label, item.platform, item.year, item.runtime ? `${item.runtime} min` : '', item.kind && item.type === 'manga' ? item.kind : ''].filter(Boolean);
  const del = () => {
    if (!confirm(`Delete ${item.title}?`)) return;
    const copy = JSON.parse(JSON.stringify(item)) as Item;
    store.remove(item.id);
    location.hash = href(room.id);
    toast(`${copy.title} deleted`, undefined, { label: 'Undo', run: () => { store.add(copy); } });
  };

  return (
    <article className="mx-auto w-full max-w-4xl px-5 pt-6 pb-28 md:pb-12">
      <a href={href(room.id)} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted no-underline hover:text-text">
        <span aria-hidden="true">←</span> {room.name}
      </a>

      {item.type === 'movie' && <CinemaScreen key={item.id} item={item} className="mt-4" />}
      {item.type === 'game' && <GameStage key={item.id} item={item} className="mt-4" />}
      {item.type === 'manga' && <OpenBook key={item.id} item={item} className="mt-4" />}
      {(item.type === 'series' || item.type === 'anime') && (
        <LivingScene className="mt-4">
          <Tv key={item.id} item={item} type={item.type} className="mx-auto w-full max-w-[560px] sm:w-[66%]" />
          <Sideboard />
          <div aria-hidden="true" className="-mx-4 h-5 bg-[linear-gradient(180deg,#4a3b2f,#2c2219)] sm:-mx-8" />
        </LivingScene>
      )}

      <header className="mt-4 grid gap-6 sm:grid-cols-[200px_1fr] sm:gap-8">
        <div className="mx-auto w-44 max-sm:hidden sm:mx-0 sm:w-full"><Cover item={item} /></div>
        <div className="min-w-0">
          <h1 className="m-0 text-3xl font-bold leading-tight text-balance sm:text-4xl">{item.title}</h1>
          <p className="m-0 mt-2 text-muted">{meta.join(' · ')}</p>
          {item.genres?.length ? <p className="m-0 mt-1 text-[13px] text-muted/80">{item.genres.slice(0, 4).join(', ')}</p> : null}
          {rel && <p className="m-0 mt-3 inline-block rounded-lg border border-amber/40 px-3 py-1.5 text-sm text-amber">{rel.year ? `Comes out in ${rel.year}` : rel.date ? `Comes out ${fmtDate(rel.date)}` : 'Coming soon'}</p>}

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Status">
            {(Object.entries(STATUS[item.type]) as [Status, string][]).map(([k, l]) => (
              <Chip key={k} on={item.status === k} onClick={() => store.update(item.id, { status: k })}>{l}</Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Stars value={item.rating || 0} onChange={n => store.update(item.id, { rating: n })} />
            {plus && (
              <button type="button" className={btn.primary} onClick={() => { plusOne(store.get(item.id)!); }}>
                +1 {plus.toLowerCase()}
              </button>
            )}
          </div>
          {item.type === 'game' && <Playtime item={item} />}
        </div>
      </header>

      {(item.type === 'anime' || item.type === 'series') && <Seasons item={item} light={room.light} />}
      {item.type === 'manga' && <Manga item={item} />}
      {item.type === 'game' && <TrophySection item={item} />}

      <section className="mt-10">
        <label htmlFor="notes" className="text-xl font-semibold font-display">Notes</label>
        <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (item.notes || '')) store.update(item.id, { notes }); }}
          placeholder="Anything you want to remember" className={cn(input, 'mt-3 py-2.5')} />
      </section>

      {item.summary && (
        <section className="mt-8">
          <h2 className="m-0 text-xl font-semibold">About</h2>
          <p className="m-0 mt-2 max-w-[70ch] text-[15px] leading-relaxed text-muted">{item.summary}</p>
        </section>
      )}

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-muted">
        <span>Added {fmtDate(item.addedAt)}{item.finishedAt ? ` · finished ${fmtDate(item.finishedAt)}` : ''}</span>
        <button type="button" className={cn(btn.danger, btn.small)} onClick={del}>Delete</button>
      </footer>
    </article>
  );
}
