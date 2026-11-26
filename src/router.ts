import { useSyncExternalStore } from 'react';

/** Tiny hash router: GitHub Pages serves one index.html, so routes live after the #. */
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const read = () => window.location.hash.replace(/^#\/?/, '');

/** Current path without the leading "#/", split into parts. "" means the overview. */
export function useRoute(): string[] {
  const path = useSyncExternalStore(subscribe, read, () => '');
  return path ? path.split('/') : [];
}

export const href = (...parts: string[]) => '#/' + parts.join('/');
