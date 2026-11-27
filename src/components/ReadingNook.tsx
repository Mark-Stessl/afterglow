/**
 * The reading nook in plain DOM and CSS (no WebGL), like the other rooms.
 * - Shelf: manga as tankōbon spines on wooden shelves. Each spine shows the title, the chapter
 *   you are on, a bookmark ribbon as long as your progress, and a sticky note for new chapters.
 * - OpenBook: on a manga's page the book tips out of the shelf and opens: the cover on the left,
 *   your place on the right, the ribbon and the sticky note.
 */
import { useEffect, useState } from 'react';
import { STATUS } from '../data/constants';
import { mangaBehind, showsNew, statusLabel } from '../data/items';
import type { Item } from '../data/types';
import { href } from '../router';
import { cn } from '../ui/kit';
import { STATUS_DOT } from './ItemCard';

const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };
/** Reading progress 0–1, or null when the total is unknown. */
export const readShare = (m: Item) => (m.chapters ? Math.min(1, (m.chaptersRead || 0) / m.chapters) : null);
const RIBBON = '#c8323f';

function Spine({ item }: { item: Item }) {
  const h = hue(item.title);
  const read = Math.floor(item.chaptersRead || 0);
  const share = readShare(item);
  const fresh = showsNew(item) ? mangaBehind(item) : 0;
  // a little variety in width and height, the same every time for the same title
  const w = 30 + (h % 4) * 4;
  const tall = 88 + (h % 3) * 6;
  const label = `${item.title}, ${statusLabel(item)}${read ? `, chapter ${read}` : ''}${item.chapters ? ` of ${Math.floor(item.chapters)}` : ''}${fresh ? `, ${fresh} new` : ''}`;
  return (
    <a href={href('item', item.id)} aria-label={label} title={item.title}
      className="spine group relative flex h-full shrink-0 items-end no-underline" style={{ width: w }}>
      <span className="relative flex w-full flex-col items-center overflow-hidden rounded-[2px_2px_1px_1px] shadow-[inset_2px_0_0_rgba(255,255,255,.12),inset_-3px_0_0_rgba(0,0,0,.25),0_0_0_1px_rgba(0,0,0,.35)] transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-2 group-focus-visible:-translate-y-2"
        style={{ height: `${tall}%`, background: `linear-gradient(90deg, hsl(${h} 38% 30%), hsl(${h} 42% 38%) 45%, hsl(${h} 38% 28%))` }}>
        {/* status dot at the top, the obi band at the bottom */}
        <span aria-hidden="true" className={cn('mt-[7%] block h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_1.5px_#f2ead8]', STATUS_DOT[item.status])} />
        <span className="mt-[8%] line-clamp-1 min-h-0 flex-1 px-0.5 font-display text-[12px] font-semibold leading-none tracking-wide text-[#f6efe0] [writing-mode:vertical-rl]">{item.title}</span>
        {/* bookmark ribbon down the spine, as long as your progress */}
        {share != null && share > 0 && (
          <span aria-hidden="true" className="ribbon absolute right-[12%] top-0 w-[4px]" style={{ height: `${Math.max(8, share * 100)}%`, background: RIBBON }} />
        )}
        <span className="relative mb-[4%] mt-[6%] flex w-full flex-col items-center bg-[#f2ead8] py-1 text-[#2a1d14]">
          <span className="text-[8px] uppercase leading-none tracking-wider opacity-70">ch</span>
          <span className="font-display text-[12px] font-bold leading-tight tabular-nums">{read || '–'}</span>
        </span>
      </span>
      {fresh > 0 && (
        <span aria-hidden="true" className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -rotate-6 rounded-[1px] bg-[#ffe27a] px-1 py-0.5 text-[10px] font-bold leading-none text-[#3a2a00] shadow-[0_2px_4px_rgba(0,0,0,.4)] tabular-nums">+{fresh}</span>
      )}
    </a>
  );
}

/** Wooden shelves; the spines wrap onto as many shelves as they need. */
export function Shelf({ items }: { items: Item[] }) {
  return (
    <div className="shelf relative mt-6 overflow-hidden rounded-xl border border-line bg-[linear-gradient(180deg,#2a1a10,#1c1109)] px-3 pt-4 pb-1 sm:px-6 sm:pt-6">
      {/* the reading lamp's warm light from the top left */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#ffc46b] opacity-20 blur-3xl" />
      <ul className="shelf-rows relative m-0 flex list-none flex-wrap items-end gap-x-[3px] p-0 px-2 pb-[var(--plank)]">
        {items.map(it => <li key={it.id} className="h-[var(--row)] pt-3"><Spine item={it} /></li>)}
      </ul>
      {/* what the dots on the spines mean */}
      <p className="relative m-0 flex flex-wrap gap-x-4 gap-y-1 px-2 py-2.5 text-[12px] text-[#d8c9b0]">
        {Object.entries(STATUS.manga).filter(([k]) => items.some(i => i.status === k)).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><i aria-hidden="true" className={cn('block h-2 w-2 rounded-full', STATUS_DOT[k as Item['status']])} />{l}</span>
        ))}
      </p>
    </div>
  );
}

/** The book tips out of the shelf and opens. */
export function OpenBook({ item, className }: { item: Item; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 160);
    return () => clearTimeout(t);
  }, [item.id]);
  const h = hue(item.title);
  const read = Math.floor(item.chaptersRead || 0);
  const total = item.chapters ? Math.floor(item.chapters) : null;
  const share = readShare(item);
  const fresh = showsNew(item) ? mangaBehind(item) : 0;
  const [failed, setFailed] = useState(false);

  return (
    <div data-open={open || undefined}
      className={cn('nook relative isolate aspect-video overflow-hidden rounded-xl border border-line bg-[linear-gradient(180deg,#2a1a10,#160d07)] sm:aspect-[2.4/1]', className)}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-80 w-80 rounded-full bg-[#ffc46b] opacity-25 blur-3xl" />
      {/* the shelf behind, out of focus */}
      <div aria-hidden="true" className="absolute inset-x-0 top-[6%] h-[40%] opacity-50 blur-[2px]"
        style={{ background: 'repeating-linear-gradient(90deg,#5a2f2a 0 14px,#2f4a5a 14px 26px,#6b5a2a 26px 44px,#3a2e4a 44px 56px,#7a4a2a 56px 72px,#2a4a3a 72px 84px)' }} />
      <div aria-hidden="true" className="absolute inset-x-0 top-[46%] h-[4%] bg-[#3a2416] shadow-[0_6px_14px_rgba(0,0,0,.6)]" />
      {/* reading table */}
      <div aria-hidden="true" className="absolute inset-x-[10%] bottom-0 h-[16%] rounded-t-[4px] bg-[linear-gradient(180deg,#4a2e1c,#2a190e)]" />

      <div className="relative mx-auto aspect-video h-full">
        <div className="nook-book absolute bottom-[12%] left-[22%] w-[56%]" style={{ aspectRatio: `${2 * 0.68}` }}>
          {/* left: inside of the cover, with the cover art */}
          <div className="nook-left absolute inset-y-0 left-0 w-1/2 overflow-hidden rounded-l-[3px] bg-[#efe9dc] shadow-[inset_-10px_0_14px_-8px_rgba(0,0,0,.35)]">
            <div className="absolute inset-[6%] overflow-hidden rounded-[2px]">
              {item.cover && !failed
                ? <img src={item.cover} alt="" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
                : <div className="absolute inset-0" style={{ background: `radial-gradient(100% 90% at 30% 20%, hsl(${h} 45% 40%), hsl(${(h + 40) % 360} 40% 14%) 75%)` }} />}
            </div>
          </div>
          {/* right: your place in the book */}
          <div className="absolute inset-y-0 right-0 flex w-1/2 flex-col rounded-r-[3px] bg-[#f4efe3] px-[7%] pt-[10%] text-[#2a1d14] shadow-[inset_10px_0_14px_-8px_rgba(0,0,0,.3)] [container-type:inline-size]">
            <span className="text-[clamp(9px,7cqw,13px)] uppercase tracking-[0.18em] opacity-60">{read ? 'You are at' : 'Not started'}</span>
            <span className="mt-[4%] font-display text-[clamp(16px,16cqw,44px)] font-bold leading-none tabular-nums">{read ? `Ch. ${read}` : '—'}</span>
            <span className="mt-[3%] text-[clamp(9px,7cqw,14px)] opacity-70">{total ? `of ${total}` : 'total unknown'}</span>
            <span className="mt-auto mb-[10%] line-clamp-2 font-display text-[clamp(10px,8cqw,16px)] font-semibold leading-tight">{item.title}</span>
            {/* page edges */}
            <span aria-hidden="true" className="absolute inset-y-[2%] -right-[3%] w-[3%] rounded-r-[2px] bg-[repeating-linear-gradient(180deg,#efe9dc_0_1px,#cfc6b2_1px_2px)]" />
          </div>
          {/* the cover swings open over the left page */}
          <div className="nook-cover absolute inset-y-0 right-0 w-1/2 overflow-hidden rounded-r-[3px] shadow-[0_8px_20px_rgba(0,0,0,.5)]">
            {item.cover && !failed
              ? <img src={item.cover} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              : <div className="absolute inset-0 grid place-items-end p-[10%]" style={{ background: `radial-gradient(100% 90% at 30% 20%, hsl(${h} 45% 40%), hsl(${(h + 40) % 360} 40% 14%) 75%)` }}>
                  <span className="font-display text-[clamp(10px,2cqw,16px)] font-semibold text-white/90">{item.title}</span>
                </div>}
          </div>
          {/* bookmark ribbon from the top of the spine, as long as your progress */}
          {share != null && share > 0 && (
            <span aria-hidden="true" className="nook-ribbon ribbon absolute left-[52%] top-0 w-[2.2%]" style={{ height: `${18 + share * 92}%`, background: RIBBON }} />
          )}
          {fresh > 0 && (
            <span className="nook-note absolute -right-[7%] top-[52%] z-10 rotate-6 rounded-[2px] bg-[#ffe27a] px-[2.5%] py-[1.5%] text-center font-semibold leading-tight text-[#3a2a00] shadow-[0_4px_10px_rgba(0,0,0,.45)] [font-size:clamp(9px,1.6vw,14px)] sm:top-[40%]">
              +{fresh} new<br className="max-sm:hidden" /><span className="font-normal max-sm:sr-only"> {fresh === 1 ? 'chapter' : 'chapters'}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
