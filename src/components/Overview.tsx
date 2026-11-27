import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { ROOMS } from '../rooms';
import { Building } from './Building';

const Building3D = lazy(() => import('../three/Building3D'));

const PREF = 'afterglow.view';

function canDo3D() {
  try {
    if (localStorage.getItem(PREF) === 'flat') return false;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if ((nav.hardwareConcurrency || 4) <= 2 || (nav.deviceMemory ?? 4) < 2) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

const narrowQuery = '(max-width: 767px)';
const useNarrow = () => useSyncExternalStore(
  cb => { const m = matchMedia(narrowQuery); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
  () => matchMedia(narrowQuery).matches,
);

/** Remember which room the phone was looking at while the app is open. */
let lastFocus = 0;

/**
 * Home: the flat building shows at once; the 3D building loads behind it and
 * fades in when its first frame is drawn. No WebGL, data saver or "Flat" chosen: flat stays.
 */
export function Overview() {
  const [want3D, setWant3D] = useState(canDo3D);
  const [ready, setReady] = useState(false);
  const [focus, setFocusState] = useState(lastFocus);
  const setFocus = (i: number) => { lastFocus = i; setFocusState(i); };
  const narrow = useNarrow();
  useEffect(() => { if (!want3D) setReady(false); }, [want3D]);

  const toggle = () => {
    const next = !want3D;
    try { localStorage.setItem(PREF, next ? '3d' : 'flat'); } catch { /* private mode */ }
    setWant3D(next);
  };

  const room = ROOMS[focus];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="relative">
        <div className={ready ? 'invisible absolute inset-x-0 top-0' : undefined} aria-hidden={ready || undefined}>
          <Building />
        </div>
        {want3D && (
          <div
            className="relative overflow-hidden rounded-sm border border-line max-md:-mx-5 max-md:rounded-none max-md:border-x-0 h-[min(50svh,440px)] md:h-auto md:aspect-[3.4/1] transition-opacity duration-500"
            style={{ opacity: ready ? 1 : 0, position: ready ? 'relative' : 'absolute', inset: ready ? undefined : 0 }}
          >
            <Suspense fallback={null}>
              <Building3D onReady={() => setReady(true)} focus={focus} onFocus={setFocus} narrow={narrow} />
            </Suspense>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {ready && narrow ? (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous room" disabled={focus === 0} onClick={() => setFocus(focus - 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-lg text-muted disabled:opacity-30">‹</button>
            <div className="flex gap-1.5" aria-label={`Room ${focus + 1} of ${ROOMS.length}: ${room.name}`} role="img">
              {ROOMS.map((r, i) => (
                <span key={r.id} className="h-1.5 rounded-full transition-all" style={{ width: i === focus ? 18 : 6, background: i === focus ? r.light : 'var(--color-line)' }} />
              ))}
            </div>
            <button type="button" aria-label="Next room" disabled={focus === ROOMS.length - 1} onClick={() => setFocus(focus + 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-lg text-muted disabled:opacity-30">›</button>
          </div>
        ) : <span />}
        <button type="button" onClick={toggle} className="min-h-11 cursor-pointer rounded-lg px-3 text-xs text-muted hover:text-text">
          {want3D ? 'Show flat' : 'Show 3D'}
        </button>
      </div>
    </div>
  );
}
