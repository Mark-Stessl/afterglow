import type { Room as RoomT } from '../rooms';
import { href } from '../router';
import { RoomArt } from '../components/RoomArt';
import { store, useStoreVersion } from '../data/store';
import { allTrophyStats } from '../data/items';

/** A room's page. For now only the header; the libraries come with the data layer. */
export function Room({ room }: { room: RoomT }) {
  useStoreVersion();
  const count = room.types.length
    ? room.types.reduce((a, t) => a + store.all(t).length, 0)
    : allTrophyStats().earned;
  const unit = room.types.length ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'trophy earned' : 'trophies earned');
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pt-6 pb-28 md:pb-12">
      <a href={href()} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted no-underline hover:text-text">
        <span aria-hidden="true">←</span> Building
      </a>
      <header className="mt-4 flex items-end gap-4">
        <span aria-hidden="true" className="relative block h-12 w-20 shrink-0" style={{ color: room.light }}>
          <RoomArt id={room.id} />
        </span>
        <div>
          <h1 className="m-0 text-3xl font-bold">{room.name}</h1>
          <p className="m-0 mt-1 text-muted">{room.holds} · <span className="tabular-nums">{count.toLocaleString('en')}</span> {unit}</p>
        </div>
      </header>
      <div className="mt-10 rounded-xl border border-dashed border-line px-6 py-14 text-center">
        <p className="m-0 font-display text-lg text-text">Still being built</p>
        <p className="m-0 mx-auto mt-2 max-w-sm text-sm text-muted">
          Your data is here already. The library for this room comes next, the 3D room after that.
        </p>
      </div>
    </section>
  );
}
