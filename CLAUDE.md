# Afterglow: context for Claude

Personal tracker (games, movies, series, anime, manga, trophies, stats, calendar) by Mark. Successor to Nightshelf (`Mark-Stessl/nightshelf`), rebuilt from scratch. No user accounts. Full plan: `docs/CONCEPT.md`.

## Setup
- Vite + React 19 + TypeScript + Tailwind v4. Hash router (`src/router.ts`), GitHub Pages at `https://mark-stessl.github.io/afterglow/`, deployed by `.github/workflows/deploy.yml` on push to `main`.
- Rooms are defined once in `src/rooms.ts`. Home (`src/components/Overview.tsx`) is a 3D carousel (`src/three/Gallery.tsx`, lazy chunk): five separate cut-away rooms modelled after Mark's reference render (`src/three/rooms/*`, textures painted at runtime in `src/three/textures.ts`, bloom for LEDs). One big room centred, neighbours dimmed at the sides; drag, trackpad, wheel, arrow keys, dots; click the centre room to walk in. The flat building (`src/components/Building.tsx`) shows until the 3D is ready and is the fallback (no WebGL, data saver, "Show flat").
- Design tokens ("Late Show" palette, fonts, room light colours) live in `src/index.css` under `@theme`. Use the tokens, no raw hex in components except scene/art colours.
- Data layer in `src/data/` (ported from Nightshelf `src/lib/`): `types` (item model, same field names as Nightshelf), `store` (localStorage `afterglow.v1`, `useStoreVersion()` for React), `items` (seasons, episodes, chapters, releases, +1), `trophies`, `sync`, `psn`, `steam`, `lookup`, `airing`, `covers`, `worker` (shared Cloudflare worker, header `X-Nightshelf-Key`).
- Afterglow and Nightshelf share the origin `mark-stessl.github.io`, so the Data page can import `nightshelf.v1` straight from this browser's localStorage. Same data format, same worker: sync works across both apps.
- Not ported yet: background episode/chapter checks (Nightshelf `watch.jsx`), bulk anime list matching (`Lookup.matchAnimeList`), push notifications.
- PWA: `pwa/sw.js` is the service worker source; `vite.config.ts` writes `dist/sw.js` with the build stamp and app-shell list. Shell cached on install, `/assets/` cache-first, fonts kept across versions, everything else network. Only touches caches named `afterglow-*` (Nightshelf shares the origin). `src/pwa.ts` registers it and shows a "new version" toast; updates wait for Reload.
- Phone gestures: drag a sheet's top bar down to close it (`useSwipeDown` in `src/ui/kit.tsx`), swipe the living-room TV sideways to change channel.
- Views in `src/views/`: `Library` (room library, status/platform chips, living room has Series/Anime channels), `Detail` (`#/item/<id>`), `AddSheet` (search → check → add), `Trophies` (trophy list of a game), `TrophyRoom` (`#/trophies`, `/stats`, `/calendar`), `DataPage` + `Connections`. Shared UI in `src/ui/kit.tsx` (buttons, chips, sheet on `<dialog>`, toasts). Covers per type in `src/components/Cover.tsx`.
- Tests: `npm test` (Vitest) for store, trophies, sync merge and item rules.
- Icons: `public/icon.svg` is the source; PNGs in `public/icons/` are rendered from it.

## Rules
- The app must be usable before any 3D has loaded. 3D is a lazy chunk, `frameloop="demand"`, reduced-motion fallback. No intro animation.
- 3D only for the overview, entering a room, the "open item" moment and the trophy case. Lists and forms stay flat.
- Always check the phone layout (390 px): bottom nav, sheets, safe areas.
- Show a preview before bigger visual changes.
- Secrets never go in the repo (sync key, NPSSO, Steam key, VAPID).
- Tried and removed in Nightshelf, do not bring back without asking: start intro, starry sky in stats, page-flipping wall calendar.
