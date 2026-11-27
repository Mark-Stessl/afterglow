import { currentSeason, hoursOf, mediaProgress, newCount, releaseInfo, showsNew, statusLabel } from '../data/items';
import { progress } from '../data/trophies';
import type { Item } from '../data/types';
import { href } from '../router';
import { cn } from '../ui/kit';
import { Cover } from './Cover';

const fmtShort = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** One line under the cover: where you are, or the status. */
export function itemLine(it: Item): string {
  const rel = releaseInfo(it);
  if (rel) return rel.year ? `Out ${rel.year}` : rel.date ? `Out ${fmtShort(rel.date)}` : 'Coming soon';
  if (it.type === 'game') {
    const p = progress(it.trophies);
    const h = hoursOf(it);
    const parts = [it.platform, p.total ? `${p.pct}%` : '', h ? `${Math.round(h)} h` : ''].filter(Boolean);
    return parts.join(' · ') || statusLabel(it);
  }
  if (it.type === 'manga' && it.status !== 'planned' && it.chaptersRead) return `Ch. ${Math.floor(it.chaptersRead)}${it.chapters ? ` / ${Math.floor(it.chapters)}` : ''}`;
  if ((it.type === 'anime' || it.type === 'series') && it.status === 'active') {
    const s = currentSeason(it);
    if (s && s.format !== 'MOVIE') return `${(s.label || '').replace('Season ', 'S')} · E${s.seen || 0}${s.episodes ? ` / ${s.episodes}` : ''}`;
  }
  return statusLabel(it);
}

export const STATUS_DOT: Record<Item['status'], string> = {
  active: 'bg-status-active', done: 'bg-status-done', paused: 'bg-status-paused', planned: 'bg-status-planned', dropped: 'bg-status-dropped',
};

/** Status at a glance, on the cover's top-left corner. */
export function StatusBadge({ item }: { item: Item }) {
  const label = statusLabel(item);
  if (!label) return null;
  return (
    <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex max-w-[calc(100%-12px)] items-center gap-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-text shadow-[0_0_0_1px_rgba(255,255,255,.08)] backdrop-blur-sm">
      <i aria-hidden="true" className={cn('block h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[item.status])} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function ItemCard({ item, light }: { item: Item; light: string }) {
  const n = showsNew(item) ? newCount(item) : 0;
  const prog = item.status === 'active' ? mediaProgress(item) : null;
  return (
    <a href={href('item', item.id)} className="item-card group block min-w-0 rounded-lg text-text no-underline">
      <div className="relative transition-transform duration-200 ease-[var(--ease-out-quint)] group-hover:-translate-y-1">
        <Cover item={item} />
        <StatusBadge item={item} />
        {n > 0 && (
          <span className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-amber px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#1a1206]">
            +{n > 99 ? '99' : n}
          </span>
        )}
      </div>
      {prog != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${Math.round(prog * 100)}%`, background: light }} />
        </div>
      )}
      <div className={prog != null ? 'mt-1.5' : 'mt-2.5'}>
        <div className="truncate text-[14px] font-semibold leading-snug">{item.title}</div>
        <div className="truncate text-[12px] text-muted">{itemLine(item)}</div>
      </div>
    </a>
  );
}
