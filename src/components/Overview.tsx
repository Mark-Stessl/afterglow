/**
 * Home: the five 3D rooms as a carousel. One large room in the centre, the neighbours at
 * the sides. Drag (mouse or finger), trackpad, mouse wheel, arrow keys, the arrows and
 * the dots move between rooms; the camera glides and settles on the nearest room.
 * Click the centre room to walk in. The flat building shows until the 3D is ready,
 * and stays when there is no WebGL, data saver is on, or "Flat" was chosen.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ROOMS } from '../rooms';
import { href } from '../router';
import type { Nav } from '../three/Gallery';
import { Building } from './Building';

const Gallery = lazy(() => import('../three/Gallery'));

const PREF = 'afterglow.view';
const LAST = ROOMS.length - 1;
const clamp = (n: number) => Math.max(0, Math.min(LAST, n));

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

/** The room the carousel was on, kept while the app is open. */
let lastIndex = 0;

export function Overview() {
  const [want3D, setWant3D] = useState(canDo3D);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(lastIndex);
  const box = useRef<HTMLDivElement>(null);
  const nav = useMemo<Nav>(() => ({
    pos: lastIndex, target: lastIndex, dragging: false, entering: null,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }), []);
  const moved = useRef(false);

  useEffect(() => { if (!want3D) setReady(false); }, [want3D]);

  const go = (i: number) => {
    nav.target = clamp(i);
    nav.invalidate?.();
  };

  const enter = (i: number) => {
    if (moved.current || nav.entering != null) return;
    if (i !== Math.round(nav.pos)) { go(i); return; }
    const to = () => { location.hash = href(ROOMS[i].id); };
    if (nav.reduced) { to(); return; }
    nav.entering = i;
    nav.invalidate?.();
    setTimeout(to, 650);
  };

  /* pixels the pointer must travel to move one room: about one room's width on screen */
  const pxPerRoom = () => {
    const el = box.current!;
    return Math.min(el.clientWidth * 0.8, el.clientHeight * 0.98);
  };

  // wheel and keys
  useEffect(() => {
    if (!ready) return;
    const el = box.current!;
    let lock = 0, idle = 0;
    const onWheel = (e: WheelEvent) => {
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      e.preventDefault();
      if (horiz) {
        // trackpad: follow the fingers, then settle on the nearest room
        nav.dragging = true;
        nav.pos = Math.max(-0.25, Math.min(LAST + 0.25, nav.pos + e.deltaX / pxPerRoom()));
        nav.invalidate?.();
        clearTimeout(idle);
        idle = window.setTimeout(() => { nav.dragging = false; go(Math.round(nav.pos)); }, 120);
        return;
      }
      const now = performance.now();
      if (now < lock || Math.abs(e.deltaY) < 4) return;
      lock = now + 520;
      go(Math.round(nav.target) + (e.deltaY > 0 ? 1 : -1));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], dialog')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(nav.target) + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(nav.target) - 1); }
      if (e.key === 'Enter' && document.activeElement === document.body) enter(Math.round(nav.target));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    addEventListener('keydown', onKey);
    return () => { el.removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey); clearTimeout(idle); };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // drag with mouse or finger (vertical page scroll stays with the browser)
  const drag = useRef<{ x: number; y: number; pos: number; t: number; id: number; axis?: 'x' | 'y' } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    moved.current = false;
    drag.current = { x: e.clientX, y: e.clientY, pos: nav.pos, t: performance.now(), id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.axis && Math.hypot(dx, dy) > 8) {
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.axis === 'x') { moved.current = true; nav.dragging = true; box.current!.setPointerCapture(d.id); box.current!.dataset.dragging = ''; }
    }
    if (d.axis !== 'x') return;
    nav.pos = Math.max(-0.3, Math.min(LAST + 0.3, d.pos - dx / pxPerRoom()));
    nav.invalidate?.();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== 'x') return;
    delete box.current!.dataset.dragging;
    nav.dragging = false;
    const dx = e.clientX - d.x;
    const v = dx / Math.max(1, performance.now() - d.t); // px per ms
    const from = Math.round(d.pos);
    let to = Math.round(nav.pos);
    // a flick or a clear pull moves at least one room
    if (to === from && (Math.abs(dx) > 50 || Math.abs(v) > 0.35)) to = from + (dx < 0 ? 1 : -1);
    go(to);
    setTimeout(() => { moved.current = false; }, 0);
  };

  const toggle = () => {
    const next = !want3D;
    try { localStorage.setItem(PREF, next ? '3d' : 'flat'); } catch { /* private mode */ }
    setWant3D(next);
  };

  const room = ROOMS[active];
  const show3D = want3D && ready;

  return (
    <div className="w-full">
      <div className="relative">
        {!show3D && <div className="px-5"><Building /></div>}
        {want3D && (
          <div
            ref={box}
            className="gallery relative w-full touch-pan-y select-none transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0, position: ready ? 'relative' : 'absolute', inset: ready ? undefined : 0 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <Suspense fallback={null}>
              <Gallery
                nav={nav}
                onReady={() => setReady(true)}
                onActive={i => { lastIndex = i; setActive(i); }}
                onPick={enter}
              />
            </Suspense>
          </div>
        )}
      </div>

      {show3D && (
        <div className="mt-2 flex flex-col items-center px-5">
          <a href={href(room.id)} onClick={e => { e.preventDefault(); enter(active); }}
            className="rounded-lg px-3 py-1 text-center no-underline">
            <span className="block font-display text-[clamp(18px,1.7vw,26px)] font-semibold text-text">{room.name}</span>
            <span className="block text-[13px] text-muted md:text-sm">{room.holds}</span>
          </a>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" aria-label="Previous room" disabled={active === 0} onClick={() => go(active - 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-raised hover:text-text disabled:pointer-events-none disabled:opacity-25">‹</button>
            <div className="flex items-center" role="group" aria-label="Choose a room">
              {ROOMS.map((r, i) => (
                <button key={r.id} type="button" onClick={() => go(i)} aria-label={r.name} aria-current={i === active ? 'true' : undefined}
                  className="flex h-11 w-7 cursor-pointer items-center justify-center">
                  <span className="block h-1.5 rounded-full transition-all duration-300"
                    style={{ width: i === active ? 22 : 6, background: i === active ? r.light : 'var(--color-line)' }} />
                </button>
              ))}
            </div>
            <button type="button" aria-label="Next room" disabled={active === LAST} onClick={() => go(active + 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-raised hover:text-text disabled:pointer-events-none disabled:opacity-25">›</button>
          </div>
        </div>
      )}
      <div className="mt-1 flex justify-center">
        <button type="button" onClick={toggle} className="min-h-11 cursor-pointer rounded-lg px-3 text-xs text-muted hover:text-text">
          {want3D ? 'Show flat' : 'Show 3D'}
        </button>
      </div>
    </div>
  );
}
