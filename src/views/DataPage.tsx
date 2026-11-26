import { useRef, useState } from 'react';
import { ORDER_TYPES, TYPES } from '../data/constants';
import { readNightshelfLocal, store, useStoreVersion } from '../data/store';
import { allTrophyStats } from '../data/items';
import { href } from '../router';

type Note = { kind: 'ok' | 'error'; text: string } | null;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="m-0 text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm text-muted">{children}</div>
    </section>
  );
}

const button = 'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const primary = `${button} bg-amber text-[#1a1206] hover:bg-[#f8c56a]`;
const secondary = `${button} border border-line bg-raised text-text hover:border-muted`;

export function DataPage() {
  useStoreVersion();
  const [note, setNote] = useState<Note>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [replace, setReplace] = useState(false);
  const nightshelf = readNightshelfLocal();
  const items = store.all();
  const trophies = allTrophyStats();

  function importText(text: string, from: string) {
    try {
      if (replace && !window.confirm(`Replace all ${items.length} items here with the backup? Items that are not in the backup will be deleted.`)) return;
      const n = store.importJSON(text, replace ? 'replace' : 'merge');
      setNote({ kind: 'ok', text: replace ? `Loaded ${plural(n, 'item')} from ${from}.` : n ? `Added ${plural(n, 'new item')} from ${from}.` : `Nothing new in ${from}: every item is already here.` });
    } catch (e) {
      setNote({ kind: 'error', text: `${from} could not be read: ${(e as Error).message}` });
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) importText(await f.text(), f.name);
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-5 pt-6 pb-28 md:pb-12">
      <a href={href()} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted no-underline hover:text-text">
        <span aria-hidden="true">←</span> Building
      </a>
      <h1 className="m-0 mt-4 text-3xl font-bold">Data</h1>
      <p className="m-0 mt-1 text-muted">Everything is saved in this browser. Back it up, or bring it over from Nightshelf.</p>

      <dl className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ORDER_TYPES.map(t => (
          <div key={t} className="rounded-lg border border-line bg-surface px-3 py-2.5">
            <dt className="text-xs text-muted">{TYPES[t].plural}</dt>
            <dd className="m-0 font-display text-xl font-semibold tabular-nums">{store.all(t).length}</dd>
          </div>
        ))}
        <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
          <dt className="text-xs text-muted">Trophies</dt>
          <dd className="m-0 font-display text-xl font-semibold tabular-nums">{trophies.earned}</dd>
        </div>
      </dl>

      {note && (
        <p role="status" className={`m-0 mt-5 rounded-lg border px-4 py-3 text-sm ${note.kind === 'ok' ? 'border-room-trophies/40 text-text' : 'border-danger/50 text-text'}`}>
          {note.text}
        </p>
      )}

      <div className="mt-6 grid gap-4">
        <Panel title="From Nightshelf">
          {nightshelf ? (
            <>
              <p className="m-0">Nightshelf has {plural(nightshelf.count, 'item')} saved in this browser. Bring them over; items already here stay as they are.</p>
              <button type="button" className={`${primary} mt-4`} onClick={() => importText(nightshelf.text, 'Nightshelf')}>
                Import {plural(nightshelf.count, 'item')}
              </button>
            </>
          ) : (
            <p className="m-0">No Nightshelf data in this browser. Open Nightshelf on the device that has your data and use “Back up” there, then import the file below.</p>
          )}
        </Panel>

        <Panel title="Backup file">
          <p className="m-0">Works with Afterglow and Nightshelf backups (.json).</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={primary} onClick={() => fileRef.current?.click()}>Import a backup</button>
            <button type="button" className={secondary} disabled={!items.length} onClick={() => download(`afterglow-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON())}>
              Download a backup
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          </div>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-text">
            <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="h-4 w-4 accent-[var(--color-danger)]" />
            Replace everything with the backup instead of adding to it
          </label>
        </Panel>

        <Panel title="Connections">
          <p className="m-0">Sync between devices, PlayStation, Steam and the movie key (TMDB) are ready underneath and get their settings next.</p>
        </Panel>
      </div>
    </section>
  );
}
