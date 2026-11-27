/**
 * Registers the service worker (production builds only). A new version waits until you tap
 * "Reload" in the toast, so a page never swaps code under you mid-edit.
 */
import { toast } from './ui/kit';

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;

  // reload only after "Reload" was tapped (the first install also changes the controller)
  let asked = false, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!asked || reloading) return;
    reloading = true;
    location.reload();
  });

  const offer = (worker: ServiceWorker) => {
    // the first install has no old version to replace
    if (!navigator.serviceWorker.controller) return;
    toast('A new version of Afterglow is ready', undefined, { label: 'Reload', run: () => { asked = true; worker.postMessage('skip-waiting'); } });
  };

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); });
      });
      // look for a new version whenever the app comes back to the front
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch (e) {
      console.warn('Service worker not registered', e);
    }
  });
}
