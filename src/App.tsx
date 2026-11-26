import { useEffect } from 'react';
import { ROOMS, roomById } from './rooms';
import { href, useRoute } from './router';
import { Building } from './components/Building';
import { Room } from './views/Room';
import { DataPage } from './views/DataPage';

function TopBar({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line/60 bg-ink/85 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <a href={href()} className="flex items-center gap-2.5 text-text no-underline">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-7 w-7" />
          <span className="font-display text-[17px] font-semibold">Afterglow</span>
        </a>
        <div className="flex items-center gap-1">
        <nav aria-label="Rooms" className="hidden gap-1 md:flex">
          {ROOMS.map(r => (
            <a
              key={r.id}
              href={href(r.id)}
              aria-current={active === r.id ? 'page' : undefined}
              className="rounded-md px-3 py-2 text-sm text-muted no-underline hover:text-text aria-[current=page]:text-text"
              style={active === r.id ? { boxShadow: `inset 0 -2px 0 ${r.light}` } : undefined}
            >
              {r.name}
            </a>
          ))}
        </nav>
          <a
            href={href('data')}
            aria-current={active === 'data' ? 'page' : undefined}
            className="rounded-md px-3 py-2 text-sm text-muted no-underline hover:text-text aria-[current=page]:text-text md:ml-2 md:border-l md:border-line md:pl-4"
          >
            Data
          </a>
        </div>
      </div>
    </header>
  );
}

/** Phone: quick jump between rooms, like the concept says. */
function BottomNav({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Rooms"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="m-0 grid list-none grid-cols-5 p-0">
        {ROOMS.map(r => (
          <li key={r.id}>
            <a
              href={href(r.id)}
              aria-current={active === r.id ? 'page' : undefined}
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted no-underline aria-[current=page]:text-text"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-5 rounded-full"
                style={{ background: r.light, opacity: active === r.id ? 1 : 0.4 }}
              />
              {r.name.replace(' room', '').replace('Reading nook', 'Manga')}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function App() {
  const [first] = useRoute();
  const room = first ? roomById(first) : undefined;
  const isData = first === 'data';

  useEffect(() => {
    document.title = room ? `${room.name} · Afterglow` : isData ? 'Data · Afterglow' : 'Afterglow';
    window.scrollTo(0, 0);
  }, [room, isData]);

  return (
    <div className="min-h-dvh">
      <TopBar active={isData ? 'data' : room?.id} />
      <main>
        {isData ? (
          <DataPage />
        ) : room ? (
          <Room room={room} />
        ) : (
          <section className="px-5 pt-8 pb-28 md:flex md:min-h-[calc(100dvh-3.5rem)] md:flex-col md:justify-center md:pb-16">
            <h1 className="sr-only">Afterglow</h1>
            <Building />
            <p className="m-0 mt-6 text-center text-xs text-muted">Build {__BUILD__}</p>
          </section>
        )}
      </main>
      <BottomNav active={room?.id} />
    </div>
  );
}
