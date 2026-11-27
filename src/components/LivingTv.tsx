/**
 * The living room in plain DOM and CSS (no WebGL), like the cinema screen and the game room.
 * - Tv: a wall TV that shows a show's cover full-screen with a channel bug and a lower third
 *   ("S2 · E7"). Changing what it shows plays a short channel zap with static noise.
 *   A small LED on the frame blinks while there are new episodes.
 * - LivingRoom: the TV over a sideboard and a remote on the coffee table. The remote's two
 *   buttons are the channels, Series and Anime.
 */
import { useEffect, useRef, useState } from 'react';
import { TYPES } from '../data/constants';
import { currentSeason, newCount, seasonDone, seasonsOf, showsNew } from '../data/items';
import type { Item, ItemType } from '../data/types';
import { href } from '../router';
import { cn } from '../ui/kit';

const CHANNEL: Partial<Record<ItemType, number>> = { series: 1, anime: 2 };
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };

/** Where you are in a show: "S2 · E7", "Movie", or "All seen". */
export function episodeTag(item: Item) {
  const list = seasonsOf(item);
  if (list.length && list.every(seasonDone)) return 'All seen';
  const cur = currentSeason(item);
  if (!cur) return '';
  if (cur.format === 'MOVIE') return cur.label || 'Movie';
  const n = list.filter(x => x.format !== 'MOVIE').indexOf(cur) + 1;
  const ep = (cur.seen || 0) + 1;
  return `S${n} · E${cur.episodes ? Math.min(ep, cur.episodes) : ep}`;
}

function Picture({ item }: { item: Item }) {
  const [failed, setFailed] = useState(false);
  if (item.cover && !failed) {
    return (
      <>
        <img src={item.cover} alt="" draggable={false} aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl saturate-150" />
        <img src={item.cover} alt="" draggable={false} onError={() => setFailed(true)} className="absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain" />
      </>
    );
  }
  const h = hue(item.title);
  return (
    // no cover: a coloured picture; the title is already in the lower third
    <div className="absolute inset-0" style={{ background: `radial-gradient(90% 120% at 30% 20%, hsl(${h} 45% 32%), hsl(${(h + 40) % 360} 40% 10%) 75%)` }} />
  );
}

/** Replays the channel zap whenever `key` changes (not under reduced motion). */
function useZap(key: string) {
  const [zap, setZap] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // the first picture tunes in too, a little shorter
    setZap(true);
    const t = setTimeout(() => setZap(false), first.current ? 380 : 480);
    first.current = false;
    return () => clearTimeout(t);
  }, [key]);
  return zap;
}

/** Sideways swipe on the TV (phones and mouse): next or previous channel. Vertical swipes still scroll. */
function useChannelSwipe(onSwipe?: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  if (!onSwipe) return {};
  return {
    onPointerDown: (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped.current = true; onSwipe(dx < 0 ? 1 : -1); }
    },
    onPointerCancel: () => { start.current = null; },
    // the link and cover would otherwise start a native drag and cancel the swipe
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    // a swipe is not a tap on the screen's link
    onClickCapture: (e: React.MouseEvent) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } },
    style: { touchAction: 'pan-y' } as React.CSSProperties,
  };
}

export function Tv({ item, type, className, link, onSwipe }: { item?: Item | null; type: ItemType; className?: string; link?: boolean; onSwipe?: (dir: 1 | -1) => void }) {
  const zap = useZap(`${type}:${item?.id || ''}`);
  const swipe = useChannelSwipe(onSwipe);
  const n = item && showsNew(item) ? newCount(item) : 0;
  const ch = CHANNEL[type] || 1;
  const tag = item ? episodeTag(item) : '';

  const screen = (
    <div className="tv-screen relative aspect-video overflow-hidden rounded-[3px] bg-[#050507] [container-type:inline-size]">
      <div className="tv-pic absolute inset-0">
        {item ? <Picture item={item} /> : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(80%_90%_at_50%_40%,#1d1830,#07070b)]">
            <span className="text-[clamp(11px,3cqw,15px)] tracking-[0.2em] text-white/55 uppercase">No signal · add a {TYPES[type].label.toLowerCase()}</span>
          </div>
        )}
        {/* channel bug */}
        <div className="absolute left-[3.5%] top-[5%] rounded-[3px] bg-black/55 px-[1.6cqw] py-[0.6cqw] font-display text-[clamp(10px,2.4cqw,14px)] font-semibold tracking-wide text-white/90">
          CH {ch} <span className="font-normal text-white/70">{TYPES[type].plural}</span>
        </div>
        {/* lower third */}
        {item && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-[linear-gradient(0deg,rgba(0,0,0,.82),rgba(0,0,0,.5)_60%,transparent)] px-[4%] pt-[8%] pb-[3.5%]">
            <span className="min-w-0 truncate font-display text-[clamp(13px,3.6cqw,24px)] font-semibold text-white">{item.title}</span>
            {tag && <span className="shrink-0 rounded-[3px] bg-room-living px-[1.4cqw] py-[0.4cqw] font-display text-[clamp(11px,2.6cqw,16px)] font-semibold tabular-nums text-ink">{tag}</span>}
          </div>
        )}
      </div>
      <div aria-hidden="true" className="tv-static pointer-events-none absolute -inset-[20%]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.07),transparent_40%)]" />
    </div>
  );

  return (
    <div className={cn('tv relative', className)} data-zap={zap || undefined} {...swipe}>
      {/* the screen's light on the wall */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-[8%] rounded-[30%] bg-room-living opacity-[0.16] blur-3xl" />
      <div className="relative rounded-[6px] bg-[#0c0c0f] p-[1.2%] shadow-[0_0_0_1px_#2a2a31,0_18px_40px_-12px_rgba(0,0,0,.8)]">
        {item && link ? <a href={href('item', item.id)} aria-label={`On ${TYPES[type].plural}: ${item.title}${tag ? `, ${tag}` : ''}`} className="block no-underline">{screen}</a> : screen}
        {/* standby / new-episode LED */}
        <span aria-hidden="true" data-on={n > 0 || undefined}
          className="tv-led absolute bottom-[0.45%] right-[3%] block h-[5px] w-[5px] rounded-full bg-[#3a1d24]" />
      </div>
      {n > 0 && <span className="sr-only">{n} new {n === 1 ? 'episode' : 'episodes'}</span>}
    </div>
  );
}

/** The remote: two channel buttons and a blinking LED when a channel has new episodes. */
function Remote({ types, type, onType, newBy }: { types: ItemType[]; type: ItemType; onType: (t: ItemType) => void; newBy: Partial<Record<ItemType, number>> }) {
  return (
    <div className="relative mx-auto flex w-fit items-center gap-1.5 rounded-[14px] bg-[linear-gradient(180deg,#2a2a31,#17171c)] p-1.5 shadow-[0_10px_22px_-6px_rgba(0,0,0,.8),inset_0_1px_0_rgba(255,255,255,.08)]">
      <span aria-hidden="true" className="tv-led mx-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[#3a1d24]" data-on={Object.values(newBy).some(Boolean) || undefined} />
      <div role="tablist" aria-label="Channel" className="flex gap-1.5">
        {types.map(t => {
          const on = t === type;
          const n = newBy[t] || 0;
          return (
            <button key={t} type="button" role="tab" aria-selected={on} onClick={() => onType(t)}
              className={cn('relative flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors',
                on ? 'bg-room-living text-ink' : 'bg-[#0f0f13] text-muted shadow-[inset_0_1px_0_rgba(255,255,255,.05)] hover:text-text')}>
              <span className={cn('font-display tabular-nums', on ? 'text-ink/70' : 'text-muted/70')}>{CHANNEL[t]}</span>
              {TYPES[t].plural}
              {n > 0 && <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', on ? 'bg-ink/20' : 'bg-room-living/20 text-room-living')}>+{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** `items`: the channel on screen. `newBy`: new episodes per channel, for the remote. */
export function LivingRoom({ types, type, onType, items, newBy }: {
  types: ItemType[]; type: ItemType; onType: (t: ItemType) => void; items: Item[]; newBy: Partial<Record<ItemType, number>>;
}) {
  const pick = items.filter(i => i.status !== 'dropped').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0] || null;
  return (
    <LivingScene>
      <Tv item={pick} type={type} link className="mx-auto w-[86%] max-w-[460px] select-none sm:w-[52%]"
        onSwipe={dir => { const i = types.indexOf(type) + dir; if (i >= 0 && i < types.length) onType(types[i]); }} />
      <Sideboard />
      <div className="relative -mx-4 mt-0 bg-[linear-gradient(180deg,#4a3b2f,#2c2219)] px-4 pt-4 pb-5 sm:-mx-8">
        <Remote types={types} type={type} onType={onType} newBy={newBy} />
      </div>
    </LivingScene>
  );
}

export function Sideboard() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-5 w-[92%] sm:mt-6 sm:w-[62%]">
      <div className="h-3 rounded-t-[3px] bg-[#2b221b] shadow-[0_-2px_14px_rgba(255,200,140,.12)]" />
      <div className="flex h-9 gap-[2px] bg-[#211a14] px-[2px] pb-[2px] sm:h-12">
        {[0, 1, 2, 3].map(i => <div key={i} className="flex-1 rounded-[2px] bg-[linear-gradient(180deg,#30261e,#251d16)]" />)}
      </div>
    </div>
  );
}

export function LivingScene({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative isolate mt-6 overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_80%_at_50%_30%,#4a4036,#2a241e_70%,#1b1713)] px-4 pt-7 sm:px-8 sm:pt-8', className)}>
      {/* warm cove light along the ceiling */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-[#ffd7a0] shadow-[0_0_26px_6px_rgba(255,200,140,.4)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,210,160,.12),transparent)]" />
      {children}
    </div>
  );
}
