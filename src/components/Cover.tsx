/**
 * Covers: movies are plain posters; the others look like the physical thing (season box, anime BD
 * with obi, console cases per platform, manga volume). The cover image fills its case. Cases share one height, so a row lines up.
 */
import { useEffect, useState } from 'react';
import { familyOf } from '../data/constants';
import type { Item } from '../data/types';
import { cn } from '../ui/kit';

type Kind = 'poster' | 'box' | 'obi' | 'ps5' | 'ps4' | 'switch' | 'switch2' | 'xbox' | 'pc' | 'case' | 'manga';

/** Width of each case as a share of the slot, so all cases end up the same height. */
const WIDTH: Record<Kind, number> = { poster: 1, obi: 1, box: 1, ps5: 1, ps4: 1, xbox: 1, case: 1, pc: 0.96, switch: 0.8, switch2: 0.8, manga: 0.84 };
/** Width / height of the case. */
const RATIO: Record<Kind, number> = { poster: 2 / 3, obi: 0.79, box: 0.79, ps5: 0.79, ps4: 0.79, xbox: 0.79, case: 0.79, pc: 0.76, switch: 0.632, switch2: 0.632, manga: 0.665 };

export function kindOf(item: Item): Kind {
  switch (item.type) {
    case 'movie': return 'poster';
    case 'series': return 'box';
    case 'anime': return 'obi';
    case 'manga': return 'manga';
    case 'game': {
      const p = item.platform || '';
      if (p === 'PS5') return 'ps5';
      if (/^PS/.test(p)) return 'ps4';
      if (p === 'Switch 2') return 'switch2';
      if (/Switch/.test(p)) return 'switch';
      if (familyOf(p) === 'Xbox') return 'xbox';
      if (familyOf(p) === 'Steam') return 'pc';
      return 'case';
    }
  }
}

const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };

/** The cover image filling the case (cropped at the edges when its shape differs), or a quiet title card when there is none or it fails. */
function Art({ item, className }: { item: Item; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [item.cover]);
  if (item.cover && !failed) {
    return (
      <div className={cn('absolute inset-0 overflow-hidden bg-black', className)}>
        <img src={item.cover} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  const h = hue(item.title);
  return (
    <div className={cn('absolute inset-0 flex items-end p-[9%]', className)}
      style={{ background: `radial-gradient(120% 80% at 20% 10%, hsl(${h} 45% 34%), hsl(${(h + 40) % 360} 40% 12%) 70%)` }}>
      <span className="line-clamp-4 font-display text-[clamp(10px,0.9em,15px)] font-semibold leading-tight text-white/90">{item.title}</span>
    </div>
  );
}

/** A small "PS" monogram in our own drawing (not the trademark logo), to sit next to the console name. */
const PsMark = () => (
  <svg viewBox="0 0 20 16" className="h-[46%] w-auto shrink-0" aria-hidden="true">
    <path d="M2 14V2h5.5a3.5 3.5 0 0 1 0 7H5v5Z M5 4.6v1.9h2.3a.95.95 0 0 0 0-1.9Z" fill="currentColor" fillRule="evenodd" />
    <path d="M10.5 12.6c1.2.9 2.8 1.4 4.4 1.4 2.2 0 3.6-1 3.6-2.6 0-1.4-1-2.1-3-2.6l-1-.3c-.8-.2-1.1-.4-1.1-.8s.4-.7 1.1-.7c.9 0 1.8.3 2.6.9l1.2-1.9a6.3 6.3 0 0 0-3.8-1.2c-2.1 0-3.5 1.1-3.5 2.7 0 1.4 1 2.1 2.9 2.6l1 .3c.9.2 1.2.4 1.2.8s-.4.7-1.2.7c-1.1 0-2.2-.4-3.1-1.1Z" fill="currentColor" />
  </svg>
);

/** Console name on the red Switch band: a white pill with the two Joy-Con halves, the name, and "2" for Switch 2. */
const SwitchMark = ({ two }: { two: boolean }) => (
  <span className="flex h-[62%] items-center gap-[0.35em] text-[6cqw] leading-none">
    <span aria-hidden="true" className="flex h-full items-center rounded-[0.35em] border-[0.14em] border-white px-[0.15em]">
      <i className="block h-[70%] w-[0.5em] rounded-l-[0.3em] bg-white" />
      <i className="ml-[0.18em] block h-[70%] w-[0.5em] rounded-r-[0.3em] border-[0.12em] border-white" />
    </span>
    <span className="flex flex-col font-sans font-bold uppercase tracking-[0.04em]">
      <span className="text-[0.62em]">Nintendo</span>
      <span className="text-[0.82em]">Switch</span>
    </span>
    {two && <span className="font-display text-[1.9em] font-bold">2</span>}
  </span>
);

const shine =<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,rgba(255,255,255,.10)_47%,transparent_56%)]" />;

function Case({ kind, item }: { kind: Kind; item: Item }) {
  switch (kind) {
    case 'poster':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[5px] bg-black">
          <Art item={item} />
          {shine}
        </div>
      );
    case 'box': {
      const n = item.seasonList?.filter(s => s.format !== 'MOVIE').length || item.seasons || 1;
      return (
        <div className="absolute inset-0 flex overflow-hidden rounded-[3px]">
          <div className="grid w-[13%] shrink-0 place-items-center bg-[#1c1828] text-[0.5em] font-bold tracking-[0.2em] text-[#cfc6ff] [writing-mode:vertical-rl]">
            {n > 1 ? `S1–${n}` : 'S1'}
          </div>
          <div className="relative flex-1 overflow-hidden"><Art item={item} /></div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[13%] w-[6%] bg-gradient-to-r from-black/45 to-transparent" />
        </div>
      );
    }
    case 'obi':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[4px]">
          <div className="absolute inset-y-0 left-[15%] right-0 overflow-hidden"><Art item={item} /></div>
          <div className="absolute inset-y-0 left-0 z-10 flex w-[15%] items-center justify-center overflow-hidden bg-[#f4f1ea] py-[6%] text-[0.5em] font-bold tracking-[0.12em] text-[#14121a] [writing-mode:vertical-rl]">
            <span className="line-clamp-1">{item.title}</span>
          </div>
          {shine}
        </div>
      );
    case 'ps5':
    case 'ps4':
    case 'xbox': {
      // blue (green for Xbox) plastic case around the insert, platform band across the top
      const rim = kind === 'xbox' ? '#0e7a0d' : kind === 'ps5' ? '#e4e6ec' : '#1d5fd8';
      const band = kind === 'ps5' ? 'bg-[#f6f6f8] text-[#111]'
        : kind === 'ps4' ? 'bg-[linear-gradient(90deg,#0b3a8c,#0a5fc2_55%,#0a8ee6)] text-white'
        : 'bg-[#107c10] text-white';
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[5px] p-[2.5%]" style={{ background: `linear-gradient(90deg, ${rim}, color-mix(in srgb, ${rim} 70%, white) 50%, ${rim})` }}>
          <div className="relative h-full w-full overflow-hidden rounded-[2px] bg-black">
            <div className={cn('absolute inset-x-0 top-0 z-10 flex h-[12.5%] items-center gap-[4%] pl-[6%]', band)}>
              {kind !== 'xbox' && <PsMark />}
              <span className="font-display text-[8.5cqw] font-semibold leading-none tracking-[0.06em]">{kind === 'ps5' ? 'PS5' : kind === 'ps4' ? 'PS4' : 'XBOX'}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 top-[12.5%] overflow-hidden"><Art item={item} /></div>
          </div>
          {shine}
        </div>
      );
    }
    case 'switch':
    case 'switch2':
      // red case, red band with the console name, the art filling the rest
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[6px] bg-[#e4000f] p-[2.5%] shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]">
          <div className="relative h-full w-full overflow-hidden rounded-[3px]">
            <div className="absolute inset-x-0 top-0 z-10 flex h-[12%] items-center bg-[#e4000f] text-white" style={{ justifyContent: kind === 'switch2' ? 'center' : 'flex-start', paddingLeft: kind === 'switch2' ? 0 : '5%' }}>
              <SwitchMark two={kind === 'switch2'} />
            </div>
            <div className="absolute inset-x-0 bottom-0 top-[12%] overflow-hidden"><Art item={item} /></div>
          </div>
          {shine}
        </div>
      );
    case 'pc':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[2px] bg-[#16181d] shadow-[inset_-5px_0_0_#0c0d10]">
          <div className="absolute inset-y-0 left-0 right-[5px] overflow-hidden"><Art item={item} /></div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[5px] bg-gradient-to-l from-black/60 to-white/5" />
        </div>
      );
    case 'manga':
      return (
        <div className="absolute inset-0 rounded-[1px_4px_4px_1px] bg-[#efe9dc]">
          <div className="absolute inset-y-0 left-0 right-[6%] overflow-hidden rounded-[1px_2px_2px_1px]"><Art item={item} /></div>
          <div aria-hidden="true" className="absolute inset-y-[2%] right-0 w-[6%] rounded-r-[3px] bg-[repeating-linear-gradient(90deg,#efe9dc_0_1px,#cfc6b2_1px_2px)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[5%] bg-gradient-to-r from-black/35 to-transparent" />
        </div>
      );
    default:
      return (
        <div className="absolute inset-0 overflow-hidden rounded-[4px] bg-[#222]">
          <Art item={item} />
          {shine}
        </div>
      );
  }
}

/**
 * Fills the width of its parent. Movie posters fill a 2:3 slot; the other slots have the height
 * of a standard case, and narrower cases (Switch, manga) are centred so the tops line up.
 */
export function Cover({ item, className }: { item: Item; className?: string }) {
  const kind = kindOf(item);
  const w = WIDTH[kind];
  return (
    <div className={cn('relative w-full', className)} style={{ aspectRatio: String(kind === 'poster' ? RATIO.poster : RATIO.ps5) }}>
      <div
        className={cn('cover-case absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-[0_10px_14px_rgba(0,0,0,.55)] [container-type:inline-size]', item.status === 'dropped' && 'opacity-60 grayscale')}
        style={{ width: `${w * 100}%`, aspectRatio: String(RATIO[kind]), fontSize: 'clamp(9px, 1em, 16px)' }}
      >
        <Case kind={kind} item={item} />
      </div>
    </div>
  );
}
