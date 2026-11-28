/**
 * The cinema: a screen between velvet curtains, a projector beam over two rows of seats.
 * With a movie, the curtains open, the projector flickers on and the cover "plays": the screen takes the
 * cover's own shape, so the whole poster fills it edge to edge, with a slow zoom and light grain.
 * The screen's light spills into the room.
 * Plain DOM and CSS (no WebGL), so real cover images always show and it costs almost nothing.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { Item } from '../data/types';
import { cn } from '../ui/kit';

const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };

function Film({ item, onShape }: { item: Item; onShape: (ratio: number) => void }) {
  const [failed, setFailed] = useState(false);
  if (item.cover && !failed) {
    return (
      <div className="cine-zoom absolute inset-0">
        <img src={item.cover} alt="" draggable={false} onError={() => { setFailed(true); onShape(16 / 9); }}
          onLoad={e => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) onShape(im.naturalWidth / im.naturalHeight); }}
          className="absolute inset-0 h-full w-full object-cover select-none" />
      </div>
    );
  }
  const h = hue(item.title);
  return (
    <div className="absolute inset-0 grid place-items-center px-[8%] text-center"
      style={{ background: `radial-gradient(90% 120% at 30% 20%, hsl(${h} 45% 30%), hsl(${(h + 40) % 360} 40% 9%) 75%)` }}>
      <span className="font-display text-[clamp(18px,4.2cqw,44px)] font-semibold leading-tight text-white/90 text-balance">{item.title}</span>
    </div>
  );
}

/** Two rows of seat backs, lit from the front by the screen. */
function Seats({ low }: { low?: boolean }) {
  const row = (n: number, y: number, w: number, h: number, key: string) => (
    <g key={key}>
      {Array.from({ length: n }, (_, i) => {
        const x = (i + 0.5) * (1000 / n) - w / 2;
        return <rect key={i} x={x} y={y} width={w} height={h} rx={w * 0.28} fill="#09070c" stroke="url(#rim)" strokeWidth="2" />;
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 1000 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 w-full', low ? 'h-[18%]' : 'h-[24%]')}>
      <defs>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--screen-light, #F5B544)" stopOpacity="0.45" />
          <stop offset="0.25" stopColor="#09070c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {row(11, 30, 70, 120, 'back')}
      {row(9, 70, 92, 110, 'front')}
    </svg>
  );
}

export function CinemaScreen({ item, caption, className, compact }: {
  item?: Item | null;
  /** Small line under the screen ("Now showing …"). */
  caption?: ReactNode;
  className?: string;
  /** Library header: a lower stage. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => setOpen(true), 160);
    return () => clearTimeout(t);
  }, [item]);
  const playing = !!item;
  // width / height of the screen: the cover's own shape once it has loaded (posters are about 2:3)
  const [ratio, setRatio] = useState(item?.cover ? 2 / 3 : 16 / 9);
  useEffect(() => { setRatio(item?.cover ? 2 / 3 : 16 / 9); }, [item?.cover]);
  const clamped = Math.min(2.4, Math.max(0.5, ratio));

  return (
    <div
      className={cn('cine relative isolate overflow-hidden rounded-xl border border-line bg-[#0b080c] [container-type:inline-size]', compact ? 'aspect-[4/3] md:aspect-[1.9/1]' : 'aspect-[4/3] sm:aspect-[16/9]', className)}
      data-open={open || undefined}
    >
      {/* room: dark walls, the screen's glow on them and on the floor */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_38%,#1d1418,transparent_75%)]" />
      {playing && item?.cover && (
        <img aria-hidden="true" alt="" src={item.cover} draggable={false}
          className="cine-glow pointer-events-none absolute left-1/2 top-[6%] h-[70%] w-[90%] -translate-x-1/2 object-cover blur-[48px] saturate-150" />
      )}

      {/* screen */}
      <div className={cn('absolute left-1/2 top-[9%] max-w-[84%] -translate-x-1/2', compact ? 'h-[66%]' : 'h-[64%]')} style={{ aspectRatio: String(clamped) }}>
        <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-[#050406] shadow-[0_0_0_3px_#151017,0_0_0_5px_#0a070b]">
          {playing && (
            <div className="cine-flicker absolute inset-0">
              <Film item={item!} onShape={setRatio} />
              <div aria-hidden="true" className="cine-grain pointer-events-none absolute -inset-[30%] opacity-[0.10] mix-blend-overlay" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,.75)]" />
            </div>
          )}
        </div>
      </div>

      {/* projector beam from the booth behind the audience */}
      {playing && <div aria-hidden="true" className="cine-beam pointer-events-none absolute inset-0" />}

      {/* curtains and valance */}
      <div aria-hidden="true" className="cine-curtain cine-curtain-l" />
      <div aria-hidden="true" className="cine-curtain cine-curtain-r" />
      <div aria-hidden="true" className="cine-valance absolute inset-x-0 top-0 h-[9%]" />

      <Seats low={compact} />

      {caption && (
        <div className="absolute inset-x-0 bottom-[5%] z-10 px-4 text-center text-[12px] tracking-[0.18em] text-muted uppercase">
          {caption}
        </div>
      )}
    </div>
  );
}
