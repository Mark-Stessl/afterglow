import { ROOMS } from '../rooms';
import { href } from '../router';
import { RoomArt } from './RoomArt';

/**
 * Flat overview: a long building at night, its five rooms side by side, left to right.
 * On a phone the row scrolls sideways and snaps to one room at a time.
 * This is also the fallback the 3D building will replace once it has loaded.
 */
export function Building() {
  return (
    <nav aria-label="Rooms" className="building relative mx-auto w-full max-w-6xl">
      {/* Phone: the row bleeds to the screen edges and scrolls sideways. */}
      <div className="overflow-x-auto overscroll-x-contain scroll-px-5 [scrollbar-width:none] max-md:-mx-5 max-md:px-5 md:overflow-visible">
        {/* roof (thick top edge) and ground (bottom line) move with the row */}
        <ul className="m-0 flex w-max snap-x snap-mandatory list-none gap-2 rounded-t-sm border-x border-t-[12px] border-b border-line border-t-[#17141f] bg-[#121019] p-3 pb-4 md:grid md:w-auto md:grid-cols-5">
          {ROOMS.map(room => (
            <li key={room.id} className="w-[72vw] max-w-[300px] shrink-0 snap-center md:w-auto md:max-w-none">
              <a
                href={href(room.id)}
                className="floor block rounded-lg no-underline"
                style={{ ['--light' as string]: room.light }}
              >
                <div
                  className="window relative aspect-square overflow-hidden rounded-md border border-black/40"
                  style={{
                    color: 'var(--light)',
                    background:
                      'radial-gradient(130% 80% at 50% 100%, color-mix(in oklab, var(--light) 30%, #0d0c12) 0%, #0d0c12 75%)',
                    boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--light) 18%, transparent)',
                  }}
                >
                  <div className="absolute inset-x-1 bottom-3 top-[28%]">
                    <RoomArt id={room.id} />
                  </div>
                </div>
                <div className="px-1 pt-2.5">
                  <span className="block font-display text-[17px] font-semibold text-text">{room.name}</span>
                  <span className="block text-[13px] text-muted">{room.holds}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
