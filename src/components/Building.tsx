import { ROOMS } from '../rooms';
import { href } from '../router';
import { RoomArt } from './RoomArt';

/**
 * Flat overview: the building at night, one lit floor per room.
 * This is also the fallback the 3D building will replace once it has loaded.
 */
export function Building() {
  return (
    <nav aria-label="Rooms" className="building relative mx-auto w-full max-w-[420px]">
      {/* roof */}
      <div
        aria-hidden="true"
        className="mx-auto h-14 w-full bg-[#121019]"
        style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
      />
      <ul className="m-0 flex list-none flex-col gap-2 border-x border-line bg-[#121019] p-3 pb-4">
        {ROOMS.map(room => (
          <li key={room.id}>
            <a
              href={href(room.id)}
              className="floor group block rounded-lg no-underline"
              style={{ ['--light' as string]: room.light }}
            >
              <div
                className="window relative aspect-[16/5] overflow-hidden rounded-md border border-black/40"
                style={{
                  color: 'var(--light)',
                  background:
                    'radial-gradient(120% 90% at 50% 100%, color-mix(in oklab, var(--light) 30%, #0d0c12) 0%, #0d0c12 75%)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--light) 18%, transparent)',
                }}
              >
                <RoomArt id={room.id} />
              </div>
              <div className="flex items-baseline justify-between gap-3 px-1 pt-2">
                <span className="font-display text-[17px] font-semibold text-text">{room.name}</span>
                <span className="text-[13px] text-muted">{room.holds}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {/* ground */}
      <div aria-hidden="true" className="-mx-6 h-px bg-line" />
    </nav>
  );
}
