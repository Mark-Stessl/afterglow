/**
 * The trophy room: display case (trophies, 3D when the device can), LED scoreboard (stats),
 * split-flap departure board (calendar). Everything also works without the 3D.
 */
import { lazy, Suspense, useState } from 'react';
import { ORDER_TYPES, TYPES } from '../data/constants';
import { allTrophyStats, hoursOf, newCount, newItems, recentTrophies, seasonsOf, upcomingEntries, upcomingText, type CalendarEntry } from '../data/items';
import { store, useStoreVersion } from '../data/store';
import { TIERS, TIER_ORDER, progress } from '../data/trophies';
import type { Item } from '../data/types';
import { Cover } from '../components/Cover';
import { canDo3D } from '../components/Overview';
import { RoomArt } from '../components/RoomArt';
import type { Room } from '../rooms';
import { href } from '../router';
import { cn } from '../ui/kit';
import { TrophyCup } from './Trophies';

type Tab = 'trophies' | 'stats' | 'calendar';
const TABS: [Tab, string][] = [['trophies', 'Display case'], ['stats', 'Scoreboard'], ['calendar', 'Departures']];
const fmt = (n: number) => n.toLocaleString('en');
const Vitrine = lazy(() => import('../three/Vitrine'));

/** The glass case in 3D. Nothing shows when the device cannot do 3D: the panels below carry everything. */
function CaseStage({ games }: { games: Item[] }) {
  const [want] = useState(canDo3D);
  const [ready, setReady] = useState(false);
  if (!want) return null;
  return (
    <section aria-label="Display case" className="relative overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_80%_at_50%_35%,#2a2018,#120d09_70%,#0a0806)]">
      <div aria-hidden="true" className="absolute inset-x-[20%] top-0 h-[2px] bg-[#bff5ec] opacity-70 shadow-[0_0_30px_8px_rgba(94,234,212,.25)]" />
      <div className={cn('h-[min(92vw,58vh,520px)] min-h-[280px] cursor-grab transition-opacity duration-700 active:cursor-grabbing', ready ? 'opacity-100' : 'opacity-0')}>
        <Suspense fallback={null}>
          <Vitrine cups={games.map(item => ({ item }))} onReady={() => setReady(true)} onPick={id => { location.hash = href('item', id); }} />
        </Suspense>
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 m-0 px-4 text-center text-[13px] text-muted">
        {games.length ? `${games.length} platinum · drag to look, click a cup for its trophies` : 'No platinum yet. The case is waiting.'}
      </p>
    </section>
  );
}

/** Split-flap characters that flip in one after another. */
function Flap({ text, width, className }: { text: string; width: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex gap-[2px]', className)}>
      {[...text.toUpperCase().slice(0, width).padEnd(width)].map((c, i) => (
        <span key={i} className="flap" style={{ animationDelay: `${i * 45}ms` }}>{c === ' ' ? '\u00a0' : c}</span>
      ))}
    </span>
  );
}
const KIND: Record<string, string> = { ep: 'EP', start: 'START', movie: 'FILM', game: 'GAME' };

/** One LED number with the unlit segments ("888") behind it. */
function Led({ value, label }: { value: number; label: string }) {
  const v = fmt(value);
  const ghost = v.replace(/\d/g, '8').padStart(Math.max(4, v.length), '8');
  return (
    <div className="rounded-lg bg-black/50 px-3 py-3 shadow-[inset_0_0_0_1px_#1d1d1a]">
      <div className="relative text-right font-mono text-3xl font-bold leading-none tabular-nums sm:text-4xl">
        <span aria-hidden="true" className="text-[#2a120a]">{ghost}</span>
        <span className="absolute inset-0 text-[#ff6a45] [text-shadow:0_0_10px_rgba(255,106,69,.65)]">{v}</span>
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#a8a29e]">{label}</div>
    </div>
  );
}
const fmtDay = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-5', className)}>
      {title && <h2 className="m-0 mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Display() {
  const s = allTrophyStats();
  const games = store.all('game');
  const plats = games
    .map(g => ({ g, p: (g.trophies || []).find(t => t.tier === 'platinum' && t.done) }))
    .filter(x => x.p)
    .sort((a, b) => (b.p!.doneAt || '').localeCompare(a.p!.doneAt || ''));
  const going = games
    .map(g => ({ g, p: progress(g.trophies) }))
    .filter(x => x.p.total && x.p.done < x.p.total && x.p.done > 0)
    .sort((a, b) => b.p.pct - a.p.pct)
    .slice(0, 6);
  const recent = recentTrophies(8);

  return (
    <div className="grid gap-4">
      <CaseStage games={plats.map(x => x.g)} />
      <Panel>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-[13px] text-muted">Trophy level</div>
            <div className="font-display text-5xl font-bold tabular-nums">{s.level.level}</div>
          </div>
          <div className="min-w-48 flex-1">
            <div className="flex justify-between text-[13px] text-muted"><span>{fmt(s.pts)} points</span><span>{s.level.need - s.level.into} to level {s.level.level + 1}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-room-trophies" style={{ width: `${s.level.pct}%` }} /></div>
          </div>
          <div className="flex gap-5">
            {TIER_ORDER.map(t => (
              <div key={t} className="flex flex-col items-center gap-1" title={TIERS[t].label}>
                <TrophyCup tier={t} size={26} />
                <span className="text-sm font-semibold tabular-nums">{fmt(s.counts[t])}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title={`Platinum · ${plats.length}`}>
        {plats.length ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4 p-0">
            {plats.map(({ g, p }) => (
              <li key={g.id}>
                <a href={href('item', g.id)} className="block text-text no-underline">
                  <Cover item={g} />
                  <div className="mt-2 truncate text-[13px] font-semibold">{g.title}</div>
                  {p!.doneAt && <div className="text-[12px] text-muted">{new Date(p!.doneAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>}
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="m-0 text-sm text-muted">No platinum yet. The case is waiting.</p>}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Closest to platinum">
          {going.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {going.map(({ g, p }) => (
                <li key={g.id}>
                  <a href={href('item', g.id)} className="block text-text no-underline">
                    <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{g.title}</span><span className="tabular-nums text-muted">{p.pct}%</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-room-trophies" style={{ width: `${p.pct}%` }} /></div>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="m-0 text-sm text-muted">Games with started trophy lists show up here.</p>}
        </Panel>
        <Panel title="Recently earned">
          {recent.length ? (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {recent.map(({ t, g }) => (
                <li key={g.id + t.id} className="flex items-center gap-3">
                  <TrophyCup tier={t.tier} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.name}</div>
                    <div className="truncate text-[12px] text-muted">{g.title} · {new Date(t.doneAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="m-0 text-sm text-muted">Nothing earned yet.</p>}
        </Panel>
      </div>
    </div>
  );
}

function Score() {
  const all = store.all();
  const year = new Date().getFullYear();
  const done = (i: Item) => i.status === 'done';
  const episodes = all.reduce((a, i) => a + (i.type === 'anime' || i.type === 'series' ? seasonsOf(i).reduce((b, x) => b + (x.seen || 0), 0) : 0), 0);
  const trophies = allTrophyStats();
  const chapters = all.reduce((a, i) => a + (i.type === 'manga' ? Math.floor(i.chaptersRead || 0) : 0), 0);
  const hours = store.all('game').reduce((a, g) => a + (hoursOf(g) || 0), 0);
  const thisYear = all.filter(i => done(i) && i.finishedAt?.startsWith(String(year))).length;
  const topGames = store.all('game').filter(g => (hoursOf(g) || 0) > 0).sort((a, b) => hoursOf(b)! - hoursOf(a)!).slice(0, 5);
  const board: [string, number][] = [
    ['Trophy level', trophies.level.level], ['Platinum', trophies.counts.platinum], ['Hours played', Math.round(hours)],
    ['Episodes', episodes], ['Chapters', chapters], [`Finished in ${year}`, thisYear],
  ];

  return (
    <div className="grid gap-4">
      <section aria-label="Scoreboard" className="rounded-xl border border-[#2a2a2a] bg-[#0b0c0a] p-3 shadow-[inset_0_0_40px_rgba(0,0,0,.6)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-[#ff6a45] [text-shadow:0_0_8px_rgba(255,106,69,.6)]">Scoreboard</span>
          <span aria-hidden="true" className="flex gap-1">{[0, 1, 2].map(i => <i key={i} className="block h-1.5 w-1.5 rounded-full bg-[#ff6a45] opacity-70" />)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {board.map(([l, v]) => <Led key={l} label={l} value={v} />)}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="By type">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="text-left text-[12px] text-muted"><th className="pb-2 font-medium">Type</th><th className="pb-2 text-right font-medium">All</th><th className="pb-2 text-right font-medium">Finished</th></tr></thead>
            <tbody>
              {ORDER_TYPES.map(t => {
                const list = store.all(t);
                return <tr key={t} className="border-t border-line"><td className="py-2">{TYPES[t].plural}</td><td className="py-2 text-right tabular-nums">{fmt(list.length)}</td><td className="py-2 text-right tabular-nums text-muted">{fmt(list.filter(done).length)}</td></tr>;
              })}
            </tbody>
          </table>
        </Panel>
        <Panel title="Most played">
          {topGames.length ? (
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {topGames.map((g, i) => (
                <li key={g.id} className="flex items-center gap-3 text-sm">
                  <span className="w-4 text-right tabular-nums text-muted">{i + 1}</span>
                  <a href={href('item', g.id)} className="min-w-0 flex-1 truncate font-semibold text-text no-underline hover:underline">{g.title}</a>
                  <span className="tabular-nums text-muted">{fmt(Math.round(hoursOf(g)!))} h</span>
                </li>
              ))}
            </ol>
          ) : <p className="m-0 text-sm text-muted">Playtime comes from Steam and PlayStation, or enter it on a game.</p>}
        </Panel>
      </div>
    </div>
  );
}

const timeOf = (e: CalendarEntry) => new Date(e.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function Departures() {
  const entries = upcomingEntries();
  const fresh = newItems();
  const days = new Map<string, CalendarEntry[]>();
  entries.slice(0, 60).forEach(e => {
    const k = new Date(e.t).toDateString();
    days.set(k, [...(days.get(k) || []), e]);
  });
  return (
    <div className="grid gap-4">
      {fresh.length > 0 && (
        <Panel title="New for you">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {fresh.slice(0, 8).map(it => (
              <li key={it.id}>
                <a href={href('item', it.id)} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-text no-underline hover:bg-raised">
                  <span className="truncate font-semibold">{it.title}</span>
                  <span className="shrink-0 rounded-full bg-amber px-2 py-0.5 text-[12px] font-bold text-[#1a1206]">+{newCount(it)} {it.type === 'manga' ? 'ch.' : 'ep.'}</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <section className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0d0d10]">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-5 py-3">
          <h2 className="m-0"><span className="sr-only">Departures</span><Flap text="Departures" width={10} className="text-[13px]" /></h2>
          <span className="font-mono text-[12px] text-muted">{entries.length} upcoming</span>
        </div>
        {entries.length ? (
          <div>
            {[...days].map(([k, list]) => (
              <div key={k}>
                <div className="bg-black/30 px-5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{fmtDay(list[0].t)}</div>
                <ul className="m-0 list-none p-0">
                  {list.map((e, i) => (
                    <li key={i} className="border-t border-[#1c1c22]">
                      <a href={href('item', e.it.id)} className="flex items-center gap-4 px-5 py-2.5 text-text no-underline hover:bg-white/[0.03]">
                        <span className="shrink-0 text-[13px] sm:text-sm">
                          <span className="sr-only">{e.dateOnly ? 'All day' : timeOf(e)}</span><Flap text={e.dateOnly ? '--:--' : timeOf(e)} width={5} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono font-bold uppercase tracking-[0.04em] text-[#f3ead2]">{e.it.title}</span>
                          <span className="block truncate text-[13px] text-muted">{upcomingText(e)}</span>
                        </span>
                        <span className="hidden shrink-0 text-[12px] sm:block"><span className="sr-only">{TYPES[e.it.type].label}</span><Flap text={KIND[e.kind] || ''} width={5} /></span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 px-5 py-10 text-center text-sm text-muted">Nothing scheduled. Release dates of your movies and games, and new episodes of running shows, land here.</p>
        )}
      </section>
    </div>
  );
}

export function TrophyRoom({ room, tab = 'trophies' }: { room: Room; tab?: string }) {
  useStoreVersion();
  const active: Tab = (TABS.find(([k]) => k === tab)?.[0]) || 'trophies';
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-6 pb-28 md:pb-12">
      <a href={href()} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted no-underline hover:text-text">
        <span aria-hidden="true">←</span> Building
      </a>
      <header className="mt-3 flex items-end gap-4">
        <span aria-hidden="true" className="relative hidden h-12 w-20 shrink-0 sm:block" style={{ color: room.light }}><RoomArt id={room.id} /></span>
        <div>
          <h1 className="m-0 text-3xl font-bold">{room.name}</h1>
          <p className="m-0 mt-1 text-muted">{room.holds}</p>
        </div>
      </header>
      <nav aria-label="Trophy room" className="mt-6 inline-flex rounded-xl border border-line bg-surface p-1">
        {TABS.map(([k, l]) => (
          <a key={k} href={href(room.id, k)} aria-current={active === k ? 'page' : undefined}
            className={cn('inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold no-underline transition-colors sm:px-4', active === k ? 'text-ink' : 'text-muted hover:text-text')}
            style={active === k ? { background: room.light } : undefined}>
            {l}
          </a>
        ))}
      </nav>
      <div className="mt-6">{active === 'trophies' ? <Display /> : active === 'stats' ? <Score /> : <Departures />}</div>
    </section>
  );
}
