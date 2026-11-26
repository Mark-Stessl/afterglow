/** Settings for sync, PlayStation, Steam and the TMDB movie key. Keys are typed here, never stored in the repo. */
import { useEffect, useState, type ReactNode } from 'react';
import * as Lookup from '../data/lookup';
import * as PSN from '../data/psn';
import * as Steam from '../data/steam';
import * as Sync from '../data/sync';
import type { CodedError } from '../data/worker';
import { BusyButton, btn, cn, input, toast } from '../ui/kit';

function Row({ title, state, children }: { title: string; state: string; children: ReactNode }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold text-text">{title}</h3>
        <span className="text-[13px] text-muted">{state}</span>
      </div>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </div>
  );
}

const errText = (e: unknown) => {
  const c = (e as CodedError).code;
  return ({
    network: 'The server is not reachable.', key_wrong: 'That key is not right.', already_claimed: 'Sync is already set up: use your key from Nightshelf instead.',
    expired: 'Sign-in expired, connect again.', key_rejected: 'Steam does not accept this key.',
  } as Record<string, string>)[c] || (e as Error).message || 'Something went wrong.';
};

function SyncRow() {
  const [s, setS] = useState(Sync.syncStatus());
  const [key, setKey] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  useEffect(() => Sync.onSyncChange(() => setS(Sync.syncStatus())), []);
  const on = Sync.enabled();
  const label = !on ? 'Off' : s.status === 'error' ? 'Error' : s.status === 'syncing' || s.status === 'pending' ? 'Syncing…' : s.lastSync ? `Synced ${new Date(s.lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'On';
  return (
    <Row title="Sync between devices" state={label}>
      {newKey && <p className="m-0 mb-3 rounded-lg border border-amber/40 p-3 text-text">Your sync key: <b className="font-mono">{newKey}</b>. Keep it safe; you need it on every other device.</p>}
      {on ? (
        <div className="flex flex-wrap gap-2">
          <BusyButton className={cn(btn.secondary, btn.small)} busy="Syncing…" onClick={() => Sync.syncNow()}>Sync now</BusyButton>
          <button type="button" className={cn(btn.ghost, btn.small)} onClick={() => { Sync.disconnect(); setS(Sync.syncStatus()); }}>Turn off on this device</button>
        </div>
      ) : (
        <>
          <p className="m-0">Uses the same server and key as Nightshelf, so both apps share one library.</p>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={async e => {
            e.preventDefault();
            try { await Sync.connect(key); setKey(''); toast('Sync is on'); } catch (err) { toast('Could not connect', errText(err)); }
            setS(Sync.syncStatus());
          }}>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} aria-label="Sync key" className={cn(input, 'min-w-0 flex-1 basis-56 font-mono')} />
            <button type="submit" className={btn.primary} disabled={key.trim().length < 10}>Connect</button>
          </form>
          <BusyButton className={cn(btn.ghost, btn.small, 'mt-2 -ml-3')} busy="Setting up…" onClick={async () => {
            try { setNewKey(await Sync.setup()); } catch (err) { toast('Could not set up sync', errText(err)); }
            setS(Sync.syncStatus());
          }}>First device? Set up sync</BusyButton>
        </>
      )}
    </Row>
  );
}

function PsnRow() {
  const [, bump] = useState(0);
  const [npsso, setNpsso] = useState('');
  const [prog, setProg] = useState('');
  const on = PSN.connected();
  return (
    <Row title="PlayStation" state={on ? (PSN.lastSync() ? `Last sync ${new Date(PSN.lastSync()!).toLocaleDateString('en-GB')}` : 'Connected') : 'Off'}>
      {on ? (
        <>
          <div className="flex flex-wrap gap-2">
            <BusyButton className={cn(btn.secondary, btn.small)} busy="Syncing…" onClick={async () => {
              try {
                const r = await PSN.syncAll({ onProgress: p => setProg(`${p.i} / ${p.total} · ${p.name}`) });
                toast('PlayStation synced', `${r.added} new, ${r.updated} updated${r.failed ? `, ${r.failed} failed` : ''}`);
              } catch (err) { toast('PlayStation sync stopped', errText(err)); }
              setProg(''); bump(n => n + 1);
            }}>Sync all games</BusyButton>
            <button type="button" className={cn(btn.ghost, btn.small)} onClick={() => { PSN.disconnect(); bump(n => n + 1); }}>Disconnect</button>
          </div>
          {prog && <p className="m-0 mt-2 truncate text-[13px]" aria-live="polite">{prog}</p>}
        </>
      ) : (
        <>
          <p className="m-0">Sign in on playstation.com, then open <span className="font-mono text-text">ca.account.sony.com/api/v1/ssocookie</span> and paste the code (npsso) here. It goes only to your own server.</p>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={async e => {
            e.preventDefault();
            try { await PSN.connect(npsso); setNpsso(''); toast('PlayStation connected'); } catch (err) { toast('Could not connect', errText(err)); }
            bump(n => n + 1);
          }}>
            <input type="password" value={npsso} onChange={e => setNpsso(e.target.value)} placeholder="npsso code" autoComplete="off" aria-label="NPSSO code" className={cn(input, 'min-w-0 flex-1 basis-56 font-mono')} />
            <button type="submit" className={btn.primary} disabled={npsso.trim().length < 20}>Connect</button>
          </form>
        </>
      )}
    </Row>
  );
}

function SteamRow() {
  const [, bump] = useState(0);
  const [key, setKey] = useState('');
  const [profile, setProfile] = useState('');
  const [prog, setProg] = useState('');
  const on = Steam.connected();
  return (
    <Row title="Steam" state={on ? (Steam.profile() || 'Connected') : 'Off'}>
      {on ? (
        <>
          <div className="flex flex-wrap gap-2">
            {Steam.hasProfile() && <BusyButton className={cn(btn.secondary, btn.small)} busy="Syncing…" onClick={async () => {
              try {
                const r = await Steam.syncAll({ onProgress: (i, n, name) => setProg(`${i} / ${n} · ${name}`) });
                toast('Steam synced', `${r.added} new, ${r.updated} updated${r.failed ? `, ${r.failed} failed` : ''}`);
              } catch (err) { toast('Steam sync stopped', errText(err)); }
              setProg('');
            }}>Sync played games</BusyButton>}
            <BusyButton className={cn(btn.ghost, btn.small)} busy="…" onClick={async () => { await Steam.disconnect(); bump(n => n + 1); }}>Disconnect</BusyButton>
          </div>
          {prog && <p className="m-0 mt-2 truncate text-[13px]" aria-live="polite">{prog}</p>}
        </>
      ) : (
        <>
          <p className="m-0">Needs your own Steam Web API key (steamcommunity.com/dev/apikey). It is stored only on your server. Add your profile to tick earned achievements.</p>
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async e => {
            e.preventDefault();
            try { await Steam.connect(key.trim(), profile.trim()); setKey(''); toast('Steam connected'); } catch (err) { toast('Could not connect', errText(err)); }
            bump(n => n + 1);
          }}>
            <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Web API key" autoComplete="off" aria-label="Steam Web API key" className={cn(input, 'font-mono')} />
            <input value={profile} onChange={e => setProfile(e.target.value)} placeholder="Profile name or link (optional)" aria-label="Steam profile" className={input} />
            <button type="submit" className={btn.primary} disabled={key.trim().length < 20}>Connect</button>
          </form>
        </>
      )}
    </Row>
  );
}

function TmdbRow() {
  const [key, setKey] = useState('');
  const [, bump] = useState(0);
  const on = Lookup.hasKey('movie');
  return (
    <Row title="Movie search (TMDB)" state={on ? 'Key saved' : 'No key'}>
      <p className="m-0">Free key from themoviedb.org (Settings → API). Saved only in this browser.</p>
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); Lookup.setKeys({ tmdb: key.trim() }); setKey(''); bump(n => n + 1); toast(key.trim() ? 'TMDB key saved' : 'TMDB key removed'); }}>
        <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder={on ? 'Replace the key' : 'API key or read access token'} autoComplete="off" aria-label="TMDB key" className={cn(input, 'min-w-0 flex-1 basis-56 font-mono')} />
        <button type="submit" className={btn.primary} disabled={!key.trim() && !on}>{key.trim() || !on ? 'Save' : 'Remove'}</button>
      </form>
    </Row>
  );
}

export function Connections() {
  const [, bump] = useState(0);
  // Steam keeps its key on the server; ask it whether Steam is set up (needs the sync key).
  useEffect(() => { if (Sync.enabled()) Steam.refresh().then(() => bump(n => n + 1)); }, []);
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="m-0 mb-4 text-lg font-semibold">Connections</h2>
      <SyncRow />
      <PsnRow />
      <SteamRow />
      <TmdbRow />
    </section>
  );
}
