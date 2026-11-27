/** Small shared UI pieces: buttons, chips, sheet, toasts, stars. */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const base = 'inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40';
export const btn = {
  primary: `${base} bg-amber text-[#1a1206] hover:bg-[#f8c56a]`,
  secondary: `${base} border border-line bg-raised text-text hover:border-muted`,
  ghost: `${base} text-muted hover:bg-raised hover:text-text`,
  danger: `${base} border border-danger/50 text-[#ff8a8d] hover:bg-danger/10`,
  small: 'min-h-9 px-3 text-[13px]',
};
export const input = 'min-h-11 w-full rounded-lg border border-line bg-ink px-3 text-[15px] text-text placeholder:text-muted/70 focus:border-amber focus:outline-none';

export function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        on ? 'border-text bg-text text-ink' : 'border-line text-muted hover:border-muted hover:text-text',
      )}
    >
      {children}
      {count != null && <span className={cn('tabular-nums', on ? 'text-ink/60' : 'text-muted/70')}>{count}</span>}
    </button>
  );
}

/**
 * Drag a bottom sheet down by its top bar to close it (phones only). It follows the finger;
 * past 110 px or a quick flick it closes, otherwise it springs back.
 */
function useSwipeDown(ref: React.RefObject<HTMLDialogElement | null>, onClose: () => void) {
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const set = (dy: number, animate: boolean) => {
    const d = ref.current;
    if (!d) return;
    d.style.transition = animate ? 'transform 220ms var(--ease-out-quint)' : 'none';
    d.style.transform = dy ? `translateY(${dy}px)` : '';
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (!matchMedia('(max-width: 767px)').matches || (e.target as Element).closest('button')) return;
      drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const g = drag.current;
      if (!g) return;
      g.dy = Math.max(0, e.clientY - g.y);
      set(g.dy, false);
    },
    onPointerUp: () => {
      const g = drag.current;
      drag.current = null;
      if (!g) return;
      const v = g.dy / Math.max(1, performance.now() - g.t);
      if (g.dy > 110 || (g.dy > 30 && v > 0.6)) { set(0, false); onClose(); } else set(0, true);
    },
  };
}

/** Modal sheet: bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const swipe = useSwipeDown(ref, onClose);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal focuses the close button; move focus to the field the sheet asks for.
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}
      aria-label={title}
      className={cn(
        'sheet m-0 max-h-[88dvh] w-full max-w-none overflow-hidden border border-line bg-surface p-0 text-text backdrop:bg-black/60',
        'max-md:mt-auto max-md:rounded-t-2xl md:m-auto md:rounded-2xl',
        wide ? 'md:max-w-2xl' : 'md:max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <header {...swipe} onPointerCancel={swipe.onPointerUp}
            className="relative flex items-center justify-between gap-3 border-b border-line px-5 py-3 max-md:touch-none max-md:pt-5">
            {/* grab handle (phones) */}
            <span aria-hidden="true" className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line md:hidden" />
            <h2 className="m-0 text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className={cn(btn.ghost, 'min-h-10 w-10 px-0')} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; sub?: string; action?: { label: string; run: () => void } };
let toasts: Toast[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export function toast(text: string, sub?: string, action?: Toast['action']) {
  const t = { id: Date.now() + Math.random(), text, sub, action };
  toasts = [...toasts.slice(-2), t];
  emit();
  setTimeout(() => { toasts = toasts.filter(x => x.id !== t.id); emit(); }, action ? 6000 : 3500);
}
export function Toaster() {
  const list = useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {list.map(t => (
        <div key={t.id} className="toast pointer-events-auto flex max-w-md items-center gap-4 rounded-xl border border-line bg-raised px-4 py-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,.8)]">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">{t.text}</div>
            {t.sub && <div className="truncate text-[13px] text-muted">{t.sub}</div>}
          </div>
          {t.action && (
            <button type="button" className={cn(btn.ghost, btn.small, 'text-amber')} onClick={() => { t.action!.run(); toasts = toasts.filter(x => x.id !== t.id); emit(); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map(n => {
        const on = n <= value;
        const star = <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill={on ? 'var(--color-amber)' : 'none'} stroke={on ? 'var(--color-amber)' : 'var(--color-line)'} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="grid h-11 w-9 cursor-pointer place-items-center" onClick={() => onChange(value === n ? 0 : n)}>{star}</button>
        ) : <span key={n}>{star}</span>;
      })}
    </div>
  );
}

/** Async button that shows a busy label while it runs. */
export function BusyButton({ onClick, children, className, busy: busyText = 'Working…' }: { onClick: () => Promise<unknown>; children: ReactNode; className?: string; busy?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className} disabled={busy} aria-busy={busy}
      onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}>
      {busy ? busyText : children}
    </button>
  );
}

export const Plus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
export const Check = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>;
