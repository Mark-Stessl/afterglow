/**
 * The game room in plain DOM, CSS and SVG (no WebGL), like the cinema screen.
 * - ConsoleBoard: a wall TV ("Now playing") over a white TV board with stylised consoles.
 *   Each console is a button that filters the library; the controller is "All games".
 * - GameStage: the "open a game" moment on a game's page. PlayStation and other discs slide
 *   out of the console and the case floats up; a Switch cartridge pops out and the screen
 *   lights up; on PC the monitor wakes and the big-box stands on the desk.
 * Consoles are drawn by us, no logos.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { familyOf } from '../data/constants';
import type { Item } from '../data/types';
import { href } from '../router';
import { cn } from '../ui/kit';
import { Cover, kindOf } from './Cover';

export type ConsoleKey = 'all' | 'ps5' | 'ps4' | 'switch' | 'pc' | 'xbox' | 'other';
/** The board shows the main consoles only: older PlayStation games stand with the PS5, every Switch game with the Switch 2. Other platforms are under All. */
export const CONSOLE_KEYS: ConsoleKey[] = ['all', 'ps5', 'switch', 'pc', 'xbox'];
const LABEL: Record<ConsoleKey, string> = { all: 'All games', ps5: 'PS5', ps4: 'PS4', switch: 'Switch 2', pc: 'PC', xbox: 'Xbox', other: 'Other' };

/** Which console on the board a game belongs to. */
export function consoleOf(item: Item): Exclude<ConsoleKey, 'all'> {
  const k = kindOf(item);
  if (k === 'ps4') return 'ps5';
  if (k === 'ps5' || k === 'switch' || k === 'switch2' || k === 'pc' || k === 'xbox') return k === 'switch2' ? 'switch' : k;
  return familyOf(item.platform) === 'Nintendo' ? 'switch' : 'other';
}

const LED = 'var(--color-room-games)';
const OFF = '#34344a';
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };

/** The cover filling a box, or a coloured title card. */
function Art({ item, className, bare }: { item: Item; className?: string; bare?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (item.cover && !failed) {
    return <img src={item.cover} alt="" draggable={false} onError={() => setFailed(true)} className={cn('absolute inset-0 h-full w-full object-cover', className)} />;
  }
  const h = hue(item.title);
  return (
    <div className={cn('absolute inset-0 grid place-items-center px-[8%] text-center', className)}
      style={{ background: `radial-gradient(100% 120% at 30% 20%, hsl(${h} 50% 32%), hsl(${(h + 40) % 360} 45% 10%) 75%)` }}>
      {!bare && <span className="font-display text-[clamp(11px,3cqw,30px)] font-semibold leading-tight text-white/90 text-balance">{item.title}</span>}
    </div>
  );
}

/* ---------- consoles (front view, standing on the board) ---------- */

function Ps5({ on }: { on: boolean }) {
  const c = on ? 'currentColor' : OFF;
  return (
    <svg viewBox="0 0 64 140" className="h-full w-auto" aria-hidden="true">
      <path d="M24 6 C12 10 6 40 8 132 L24 132 Z" fill="#f3f3f7" />
      <path d="M40 6 C52 10 58 40 56 132 L40 132 Z" fill="#e2e2ea" />
      <rect x="24" y="8" width="16" height="124" rx="2" fill="#15151a" />
      <rect x="23.4" y="10" width="1.4" height="118" fill={c} />
      <rect x="39.2" y="10" width="1.4" height="118" fill={c} />
      <rect x="14" y="132" width="36" height="5" rx="2" fill="#1b1b21" />
    </svg>
  );
}

function Ps4({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 130 40" className="h-full w-auto" aria-hidden="true">
      <path d="M8 6 H122 L117 19 H13 Z" fill="#202027" />
      <path d="M13 20.5 H117 L122 34 H8 Z" fill="#17171c" />
      <rect x="13" y="19" width="104" height="1.5" fill="#050507" />
      <rect x="56" y="6" width="18" height="1.8" fill={on ? 'currentColor' : OFF} />
      <rect x="14" y="34" width="102" height="3" fill="#0d0d10" />
    </svg>
  );
}

function SwitchDock({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 120 84" className="h-full w-auto" aria-hidden="true">
      <rect x="10" y="6" width="14" height="52" rx="7" fill="#12a7da" />
      <rect x="96" y="6" width="14" height="52" rx="7" fill="#ff4b55" />
      <rect x="22" y="6" width="76" height="52" rx="2" fill="#18181d" />
      <rect x="27" y="11" width="66" height="40" rx="1" fill={on ? '#26357a' : '#0b0b0f'} />
      {on && <rect x="27" y="11" width="66" height="40" rx="1" fill="currentColor" opacity="0.35" />}
      <path d="M16 34 H104 L108 82 H12 Z" fill="#24242b" />
      <rect x="54" y="72" width="12" height="2" rx="1" fill={on ? 'currentColor' : OFF} />
    </svg>
  );
}

function PcTower({ on }: { on: boolean }) {
  const c = on ? 'currentColor' : OFF;
  return (
    <svg viewBox="0 0 70 120" className="h-full w-auto" aria-hidden="true">
      <rect x="6" y="4" width="58" height="112" rx="3" fill="#121318" />
      <rect x="10" y="8" width="32" height="104" rx="2" fill="#0b0c10" stroke="#2a2c36" />
      {[30, 60, 90].map(y => (
        <g key={y}>
          <circle cx="26" cy={y} r="11" fill="none" stroke={c} strokeWidth="2" />
          <circle cx="26" cy={y} r="3" fill="#1d1e25" />
        </g>
      ))}
      <rect x="47" y="10" width="13" height="100" rx="1" fill="#1a1b21" />
      <circle cx="53.5" cy="18" r="1.8" fill={c} />
    </svg>
  );
}

function XboxTower({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 60 120" className="h-full w-auto" aria-hidden="true">
      <rect x="6" y="6" width="48" height="110" rx="3" fill="#17181b" />
      <ellipse cx="30" cy="8" rx="20" ry="3.5" fill="#0c0c0e" />
      <ellipse cx="30" cy="8" rx="15" ry="2.4" fill={on ? 'currentColor' : OFF} opacity={on ? 0.8 : 1} />
      <circle cx="14" cy="22" r="1.8" fill={on ? '#ffffff' : OFF} />
    </svg>
  );
}

function OtherBox({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 90 50" className="h-full w-auto" aria-hidden="true">
      <rect x="6" y="10" width="78" height="34" rx="4" fill="#1d1d24" />
      <rect x="14" y="27" width="40" height="2" fill="#0a0a0d" />
      <circle cx="72" cy="28" r="2.4" fill={on ? 'currentColor' : OFF} />
    </svg>
  );
}

function Controller({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 100 56" className="h-full w-auto" aria-hidden="true">
      <path d="M24 10 H76 C90 10 97 26 98 40 C99 51 90 55 83 48 L73 39 H27 L17 48 C10 55 1 51 2 40 C3 26 10 10 24 10 Z" fill="#ececf3" />
      <rect x="38" y="14" width="24" height="12" rx="2" fill="#d6d6e0" />
      <rect x="38" y="14" width="24" height="1.6" fill={on ? 'currentColor' : OFF} />
      <path d="M20 22 h4 v-4 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 Z" fill="#2b2b33" />
      {[[76, 18], [82, 24], [70, 24], [76, 30]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#2b2b33" />)}
      <circle cx="38" cy="33" r="4.5" fill="#1f1f26" />
      <circle cx="62" cy="33" r="4.5" fill="#1f1f26" />
    </svg>
  );
}

/** Height of each console on the board, relative to the PS5. */
const MODEL: Record<ConsoleKey, { el: (on: boolean) => ReactNode; h: string }> = {
  all: { el: on => <Controller on={on} />, h: 'h-[24px] sm:h-[34px] md:h-[40px]' },
  ps5: { el: on => <Ps5 on={on} />, h: 'h-[92px] sm:h-[118px] md:h-[136px]' },
  ps4: { el: on => <Ps4 on={on} />, h: 'h-[20px] sm:h-[38px] md:h-[44px]' },
  switch: { el: on => <SwitchDock on={on} />, h: 'h-[42px] sm:h-[72px] md:h-[84px]' },
  pc: { el: on => <PcTower on={on} />, h: 'h-[82px] sm:h-[104px] md:h-[120px]' },
  xbox: { el: on => <XboxTower on={on} />, h: 'h-[80px] sm:h-[100px] md:h-[116px]' },
  other: { el: on => <OtherBox on={on} />, h: 'h-[22px] sm:h-[38px] md:h-[44px]' },
};

/** The game touched last plays on the wall TV. */
function WallTv({ items }: { items: Item[] }) {
  const pick = items.filter(i => i.status !== 'dropped').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
  const screen = (
    <div className="relative aspect-video overflow-hidden rounded-[3px] bg-[#06060a] shadow-[0_0_0_4px_#0c0c10,0_0_40px_-4px_var(--color-room-games)] [container-type:inline-size]">
      {pick ? (
        <>
          <Art item={pick} className="scale-110 blur-xl saturate-150 opacity-70" />
          <div className="absolute inset-y-[8%] left-[6%] aspect-[3/4] overflow-hidden rounded-[2px] shadow-[0_6px_20px_rgba(0,0,0,.6)]"><Art item={pick} /></div>
          <div className="absolute inset-y-0 left-[44%] right-[5%] flex flex-col justify-center">
            <span className="text-[clamp(8px,3.6cqw,12px)] tracking-[0.2em] text-white/70 uppercase">Now playing</span>
            <span className="mt-1 line-clamp-2 font-display text-[clamp(12px,6.4cqw,24px)] font-semibold leading-tight text-white">{pick.title}</span>
            {pick.platform && <span className="mt-1 text-[clamp(9px,3.6cqw,13px)] text-white/70">{pick.platform}</span>}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(80%_90%_at_30%_30%,#2a2f7a,#0b0b1c)]">
          <div className="absolute inset-x-[8%] bottom-[16%] flex gap-[3%]">
            {['#e8526e', '#e8c45a', '#5ad0e0', '#7fd67a', '#b98af0', '#f08a3c'].map(c => <i key={c} className="block aspect-square flex-1 rounded-[2px]" style={{ background: c, opacity: 0.8 }} />)}
          </div>
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.18)_0_1px,transparent_1px_3px)] opacity-40" />
    </div>
  );
  return pick
    ? <a href={href('item', pick.id)} aria-label={`Now playing: ${pick.title}`} className="block rounded-[4px] no-underline">{screen}</a>
    : screen;
}

export function ConsoleBoard({ items, value, onPick }: { items: Item[]; value: ConsoleKey; onPick: (k: ConsoleKey) => void }) {
  const count = (k: ConsoleKey) => (k === 'all' ? items.length : items.filter(i => consoleOf(i) === k).length);
  const keys = CONSOLE_KEYS;

  return (
    <div className="groom relative isolate mt-6 overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_80%_at_50%_30%,#2a2960,#13132c_70%,#0c0c1a)] px-3 pt-6 sm:px-6 sm:pt-8">
      {/* LED cove along the ceiling */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#5B8CFF,#9c7dff_60%,#ff7ad9)] shadow-[0_0_24px_4px_rgba(120,120,255,.45)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(120,130,255,.16),transparent)]" />

      <div className="relative mx-auto w-[78%] max-w-[420px] sm:w-[52%]">
        <WallTv items={items} />
      </div>

      {/* consoles standing on the white board; each label is printed on the board's front */}
      <div className="relative -mx-3 mt-6 sm:-mx-6 sm:mt-8">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-11 bg-[linear-gradient(180deg,#f1f0f7,#d9d8e4)] shadow-[0_1px_0_#ffffff_inset]" />
        <div role="group" aria-label="Consoles" className="relative flex items-end justify-center-safe gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:gap-7 sm:px-6">
          {keys.map(k => {
            const on = value === k;
            const n = count(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => onPick(on && k !== 'all' ? 'all' : k)}
                className={cn('group flex shrink-0 cursor-pointer flex-col items-center rounded-lg px-1 transition-opacity sm:px-1.5 duration-300', !on && n === 0 && 'opacity-60')}
                style={{ color: LED }}>
                <span className={cn('flex items-end transition-[transform,filter] duration-300 group-hover:-translate-y-0.5', MODEL[k].h)}
                  style={{ filter: on ? 'drop-shadow(0 0 10px rgba(91,140,255,.6))' : undefined }}>{MODEL[k].el(on)}</span>
                <span className={cn('flex h-11 flex-col items-center justify-center leading-tight', on ? 'text-[#1b2a6b]' : 'text-[#4a4960]')}>
                  <span className="text-[11px] font-semibold whitespace-nowrap sm:text-xs">{k === 'all' ? <><span className="sm:hidden">All</span><span className="max-sm:hidden">All games</span></> : LABEL[k]}</span>
                  <span className="text-[10px] tabular-nums opacity-75 sm:text-[11px]">{n}<span className="sr-only"> {n === 1 ? 'game' : 'games'}</span></span>
                  <i aria-hidden="true" className="mt-0.5 block h-[3px] w-6 rounded-full transition-[background,box-shadow] duration-300"
                    style={on ? { background: LED, boxShadow: '0 0 8px 1px rgba(91,140,255,.8)' } : { background: 'transparent' }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="-mx-3 h-[3px] bg-[#5B8CFF] opacity-80 shadow-[0_6px_20px_2px_rgba(91,140,255,.55)] sm:-mx-6" />
      <div aria-hidden="true" className="-mx-3 h-5 bg-[linear-gradient(180deg,#3a2c24,#21160f)] sm:-mx-6" />
    </div>
  );
}

/* ---------- the "open a game" moment ---------- */

function DiscConsole({ kind }: { kind: string }) {
  if (kind === 'ps5') {
    return (
      <svg viewBox="0 0 200 56" className="h-auto w-full" aria-hidden="true">
        <path d="M4 18 C24 4 120 0 196 6 V18 Z" fill="#f3f3f7" />
        <path d="M4 38 C24 52 120 56 196 50 V38 Z" fill="#dcdce6" />
        <rect x="4" y="18" width="192" height="20" fill="#15151a" />
        <rect x="4" y="17.2" width="192" height="1.4" className="g-led" />
        <rect x="4" y="37.4" width="192" height="1.4" className="g-led" />
      </svg>
    );
  }
  if (kind === 'xbox') {
    return (
      <svg viewBox="0 0 200 56" className="h-auto w-full" aria-hidden="true">
        <rect x="4" y="4" width="192" height="48" rx="3" fill="#18191c" />
        <rect x="4" y="4" width="192" height="1.6" fill="#2a2b30" />
        <circle cx="180" cy="20" r="2.4" className="g-led" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 56" className="h-auto w-full" aria-hidden="true">
      <path d="M8 4 H192 L186 27 H14 Z" fill="#202027" />
      <path d="M14 29 H186 L192 52 H8 Z" fill="#17171c" />
      <rect x="14" y="27" width="172" height="2" fill="#050507" />
      <rect x="88" y="4" width="24" height="2" className="g-led" />
    </svg>
  );
}

function Disc({ item }: { item: Item }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-full bg-[conic-gradient(from_20deg,#d9dde8,#a9c2ff,#f2c4ff,#c9f2e8,#f5e7b0,#d9dde8)] shadow-[0_4px_14px_rgba(0,0,0,.5)] [container-type:inline-size]">
      <div className="absolute inset-[16%] overflow-hidden rounded-full"><Art item={item} bare /></div>
      <div className="absolute inset-[42%] rounded-full bg-[#c8ccd6] shadow-[0_0_0_2px_#9aa0ad]" />
      <div className="absolute inset-[46%] rounded-full bg-[#1a1830]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(130deg,transparent_35%,rgba(255,255,255,.35)_48%,transparent_60%)]" />
    </div>
  );
}

export function GameStage({ item, className }: { item: Item; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 160);
    return () => clearTimeout(t);
  }, [item.id]);
  const c = consoleOf(item);
  const kind = kindOf(item);
  const scene = c === 'switch' ? 'switch' : c === 'pc' ? 'pc' : 'disc';

  return (
    <div data-on={on || undefined}
      className={cn('gstage relative isolate aspect-video overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_90%_at_50%_25%,#2b2a62,#121229_70%,#0b0b18)] sm:aspect-[2.4/1]', className)}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#5B8CFF,#9c7dff_60%,#ff7ad9)] shadow-[0_0_24px_4px_rgba(120,120,255,.45)]" />
      <div className="relative mx-auto aspect-video h-full">

        {scene !== 'pc' && (
          <>
            {/* white TV board */}
            <div aria-hidden="true" className="absolute inset-x-[6%] bottom-[10%] h-[14%] rounded-[2px] bg-[linear-gradient(180deg,#f1f0f7,#d5d4e0)]" />
            <div aria-hidden="true" className="g-glow absolute inset-x-[6%] bottom-[9.4%] h-[0.8%] bg-[#5B8CFF]" />
          </>
        )}

        {scene === 'disc' && (
          <>
            <div className="absolute bottom-[24%] left-[12%] w-[42%]"><DiscConsole kind={kind} /></div>
            {/* the disc rises out of the slot: its lower part stays hidden inside the console */}
            <div className="absolute left-[23%] w-[20%] overflow-hidden" style={{ bottom: 'calc(24% + 42% * 56 / 200 * 16 / 9 - 0.5%)', aspectRatio: '1' }}>
              <div className="g-disc"><Disc item={item} /></div>
            </div>
            <div className="g-case absolute bottom-[24%] right-[15%] w-[17%]"><div className="g-bob"><Cover item={item} /></div></div>
          </>
        )}

        {scene === 'switch' && (
          <>
            {/* cartridge pops out of the slot on top */}
            <div className="absolute left-[33%] w-[8%] overflow-hidden" style={{ bottom: 'calc(24% + 46% / 2.2 * 16 / 9 - 0.5%)', aspectRatio: '0.72' }}>
              <div className="g-cart relative h-full w-full overflow-hidden rounded-t-[4px] bg-[#e9e9ef] p-[8%] [container-type:inline-size]">
                <div className="relative h-[78%] overflow-hidden rounded-[2px]"><Art item={item} /></div>
              </div>
            </div>
            <div className="absolute bottom-[24%] left-[27%] flex w-[46%] [container-type:inline-size]" style={{ aspectRatio: '2.2' }}>
              <div className="w-[12%] rounded-l-[40%_30%] bg-[#12a7da]" />
              <div className="relative flex-1 bg-[#18181d] p-[3%]">
                <div className="relative h-full overflow-hidden rounded-[2px] bg-[#07070a]">
                  <div className="g-screen absolute inset-0"><Art item={item} /></div>
                </div>
              </div>
              <div className="w-[12%] rounded-r-[40%_30%] bg-[#ff4b55]" />
            </div>
          </>
        )}

        {scene === 'pc' && (
          <>
            {/* desk, monitor, keyboard, the big-box next to it */}
            <div aria-hidden="true" className="absolute inset-x-[4%] bottom-[10%] h-[12%] rounded-[2px] bg-[linear-gradient(180deg,#3a2c24,#1f150f)]" />
            <div aria-hidden="true" className="absolute bottom-[22%] left-[39%] h-[10%] w-[2.5%] bg-[#1b1c22]" />
            <div aria-hidden="true" className="absolute bottom-[22%] left-[34%] h-[1.2%] w-[12.5%] rounded-t-[2px] bg-[#1b1c22]" />
            <div className="absolute bottom-[31%] left-[17%] w-[47%] rounded-[3px] bg-[#0d0e12] p-[0.9%] shadow-[0_0_0_1px_#26272f]" style={{ aspectRatio: '16 / 9' }}>
              <div className="relative h-full overflow-hidden rounded-[1px] bg-[#040406] [container-type:inline-size]">
                <div className="g-screen absolute inset-0"><Art item={item} className="scale-110 blur-md opacity-60" /><div className="absolute inset-y-[8%] left-1/2 aspect-[3/4] -translate-x-1/2 overflow-hidden rounded-[2px]"><Art item={item} /></div></div>
              </div>
            </div>
            <div aria-hidden="true" className="absolute bottom-[22%] left-[24%] h-[2.2%] w-[30%] rounded-[2px] bg-[#16171c] shadow-[0_2px_10px_rgba(91,140,255,.6)]" />
            <div className="g-case absolute bottom-[22%] right-[13%] w-[15%]"><div className="g-bob"><Cover item={item} /></div></div>
          </>
        )}
      </div>
    </div>
  );
}
