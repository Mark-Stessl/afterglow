/** Trophy list of one game: tick, filter, paste a list, generate one, refresh from PlayStation/Steam. */
import { useState } from 'react';
import { isPS } from '../data/constants';
import * as PSN from '../data/psn';
import * as Steam from '../data/steam';
import { store } from '../data/store';
import { GENRES, TIERS, TIER_ORDER, generate, parse, progress, syncPlatinum } from '../data/trophies';
import type { GenreKey, Item, Tier, Trophy } from '../data/types';
import type { CodedError } from '../data/worker';
import { BusyButton, Check, Chip, Sheet, btn, cn, input, toast } from '../ui/kit';

export function TrophyCup({ tier, size = 22 }: { tier: Tier; size?: number }) {
  const c = TIERS[tier].hex;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h10v5.5a5 5 0 0 1-10 0z" fill={c} />
      <path d="M7 5H4.5v1.2A3 3 0 0 0 7.4 9.5M17 5h2.5v1.2a3 3 0 0 1-2.9 3.3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13.5V17M8.5 20.5h7l-1-3.5h-5z" fill={c} />
      <path d="M9.5 4.6v3.2" stroke="#fff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Tick or untick one trophy; platinum follows. */
export function toggleTrophy(gameId: string, trophyId: string) {
  const g = store.get(gameId);
  if (!g?.trophies) return;
  const t = g.trophies.find(x => x.id === trophyId);
  if (!t || t.tier === 'platinum') { if (t) toast('Platinum comes by itself', 'Earn every other trophy'); return; }
  const list = g.trophies.map(x => x.id === trophyId ? { ...x, done: !x.done, doneAt: !x.done ? new Date().toISOString() : null } : { ...x });
  const plat = syncPlatinum(list);
  store.update(g.id, { trophies: list, ...(plat === 'earned' ? { status: 'done' as const } : {}) });
  if (plat === 'earned') toast('Platinum!', g.title);
}

function setList(item: Item, list: Trophy[], source: string) {
  syncPlatinum(list);
  store.update(item.id, { trophies: list, trophySource: source });
}

const SOURCE: Record<string, string> = { generated: 'Made from a genre template', ai: 'Made by AI for this game', imported: 'Pasted list', custom: 'Own list', psn: 'From PlayStation', steam: 'From Steam · tier from rarity' };

export function TrophySection({ item }: { item: Item }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [sheet, setSheet] = useState<'paste' | 'generate' | null>(null);
  const list = item.trophies || [];
  const p = progress(list);
  const sorted = list.slice().sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  const shown = sorted.filter(t => filter === 'all' || (filter === 'open' ? !t.done : t.done));

  const fromPsn = async () => {
    try {
      const r = await PSN.syncOne(store.get(item.id)!);
      toast(r ? 'Trophies updated' : 'Not found in your PlayStation history', r ? `${r.filter(t => t.done).length} of ${r.length} earned` : undefined);
    } catch (e) { toast((e as CodedError).code === 'expired' ? 'PlayStation sign-in expired' : 'PlayStation not reachable', 'Reconnect under Data'); }
  };
  const fromSteam = async () => {
    try {
      const g = store.get(item.id)!;
      const hit = g.steamAppId ? { appid: g.steamAppId } : await Steam.find(g.title);
      if (!hit) { toast('Not found on Steam', 'Check the title'); return; }
      const res = await Steam.achievementsFor(hit.appid);
      if (!res.achievements.length) { toast('No Steam achievements', 'This game has none on Steam'); return; }
      store.update(g.id, Steam.patchFor(g, hit.appid, res));
      const t = store.get(g.id)!.trophies || [];
      toast('Achievements loaded', `${t.filter(x => x.done).length} of ${t.length} earned`);
    } catch { toast('Steam not reachable', 'Try again later'); }
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-semibold">Trophies</h2>
          {item.trophySource && SOURCE[item.trophySource] && <p className="m-0 text-[13px] text-muted">{SOURCE[item.trophySource]}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {PSN.connected() && (item.psnId || isPS(item.platform)) && <BusyButton className={cn(btn.secondary, btn.small)} busy="Loading…" onClick={fromPsn}>From PlayStation</BusyButton>}
          {Steam.connected() && (item.steamAppId || item.platform === 'Steam') && <BusyButton className={cn(btn.secondary, btn.small)} busy="Loading…" onClick={fromSteam}>From Steam</BusyButton>}
          <button type="button" className={cn(btn.secondary, btn.small)} onClick={() => setSheet('paste')}>Paste a list</button>
          <button type="button" className={cn(btn.secondary, btn.small)} onClick={() => setSheet('generate')}>Make a list</button>
        </div>
      </div>

      {list.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="min-w-40 flex-1">
              <div className="flex justify-between text-[13px]"><span className="text-muted">{p.done} of {p.total} earned</span><span className="font-semibold tabular-nums">{p.pct}%</span></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-room-trophies" style={{ width: `${p.pct}%` }} /></div>
            </div>
            <div className="flex gap-4">
              {TIER_ORDER.map(t => p.counts[t][1] > 0 && (
                <span key={t} className="flex items-center gap-1 text-[13px] tabular-nums" title={TIERS[t].label}>
                  <TrophyCup tier={t} size={18} />{p.counts[t][0]}<span className="text-muted">/{p.counts[t][1]}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {([['all', 'All'], ['open', 'Open'], ['done', 'Earned']] as const).map(([k, l]) => <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
          </div>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
            {shown.map(t => (
              <li key={t.id} className={cn('flex items-start gap-3 rounded-lg px-2 py-2.5', t.done ? '' : 'opacity-[0.82]')}>
                <button type="button" aria-pressed={t.done} aria-label={t.done ? `Mark ${t.name} as open` : `Tick ${t.name}`}
                  onClick={() => toggleTrophy(item.id, t.id)}
                  className={cn('mt-0.5 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors',
                    t.done ? 'border-room-trophies bg-room-trophies text-ink' : 'border-line text-transparent hover:border-muted')}>
                  <Check />
                </button>
                <span className="mt-1 shrink-0"><TrophyCup tier={t.tier} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold leading-snug">
                    {t.name}
                    {t.dlc && <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-muted">DLC</span>}
                  </div>
                  {t.desc && <div className="text-[13px] text-muted">{t.desc}</div>}
                  {t.done && t.doneAt && <div className="text-[12px] text-muted/80">Earned {fmtDate(t.doneAt)}</div>}
                </div>
                {t.rarity != null && <span className="shrink-0 pt-1 text-[12px] tabular-nums text-muted">{t.rarity}%</span>}
              </li>
            ))}
            {!shown.length && <li className="py-6 text-center text-sm text-muted">Nothing in this view.</li>}
          </ul>
        </>
      ) : (
        <p className="m-0 mt-4 rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
          No trophies yet. {isPS(item.platform) ? 'Paste the official list, or make one.' : 'No official ones for this game? Make a list.'}
        </p>
      )}

      <PasteSheet item={item} open={sheet === 'paste'} onClose={() => setSheet(null)} />
      <GenerateSheet item={item} open={sheet === 'generate'} onClose={() => setSheet(null)} />
    </section>
  );
}

function PasteSheet({ item, open, onClose }: { item: Item; open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const parsed = text.trim() ? parse(text) : [];
  return (
    <Sheet open={open} onClose={onClose} title="Paste a trophy list">
      <p className="m-0 text-sm text-muted">Copy the list from PSNProfiles, Exophase or Steam and paste it here. Own format: <code className="text-text">Name | Description | Gold</code></p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={8} className={cn(input, 'mt-3 py-2 font-mono text-[13px]')} aria-label="Trophy list" />
      <p className="m-0 mt-2 text-[13px] text-muted">{parsed.length ? `${parsed.length} trophies found, ${parsed.filter(t => t.done).length} already earned` : 'Nothing found yet'}</p>
      <button type="button" className={cn(btn.primary, 'mt-4 w-full')} disabled={!parsed.length}
        onClick={() => {
          if ((item.trophies || []).length && !confirm(`Replace the ${item.trophies!.length} trophies of ${item.title}?`)) return;
          setList(item, parsed.map(t => ({ ...t, doneAt: t.done ? new Date().toISOString() : null })), 'imported');
          toast(`${parsed.length} trophies added`, item.title); setText(''); onClose();
        }}>
        Use this list
      </button>
    </Sheet>
  );
}

function GenerateSheet({ item, open, onClose }: { item: Item; open: boolean; onClose: () => void }) {
  const [genre, setGenre] = useState<GenreKey>(item.genre || 'other');
  const [size, setSize] = useState<'short' | 'normal' | 'long'>('normal');
  return (
    <Sheet open={open} onClose={onClose} title="Make a trophy list">
      <p className="m-0 text-sm text-muted">For games without official trophies: a list from a template that fits the genre. Same game and genre always give the same list.</p>
      <label className="mt-4 block">
        <span className="text-xs text-muted">Genre</span>
        <select value={genre} onChange={e => setGenre(e.target.value as GenreKey)} className={cn(input, 'mt-1 cursor-pointer')}>
          {(Object.entries(GENRES) as [GenreKey, string][]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <div className="mt-4">
        <span className="text-xs text-muted">Length</span>
        <div className="mt-1.5 flex gap-2">
          {([['short', 'Short · 8'], ['normal', 'Normal · 13'], ['long', 'Long · 19']] as const).map(([k, l]) => <Chip key={k} on={size === k} onClick={() => setSize(k)}>{l}</Chip>)}
        </div>
      </div>
      <button type="button" className={cn(btn.primary, 'mt-5 w-full')}
        onClick={() => {
          if ((item.trophies || []).length && !confirm(`Replace the ${item.trophies!.length} trophies of ${item.title}?`)) return;
          const list = generate(item.title, genre, size);
          setList(item, list, 'generated');
          store.update(item.id, { genre });
          toast(`${list.length} trophies made`, item.title); onClose();
        }}>
        Make the list
      </button>
    </Sheet>
  );
}
