# Afterglow: context for Claude

Personal tracker (games, movies, series, anime, manga, trophies, stats, calendar) by Mark. Successor to Nightshelf (`Mark-Stessl/nightshelf`), rebuilt from scratch. No user accounts. Full plan: `docs/CONCEPT.md`.

## Setup
- Vite + React 19 + TypeScript + Tailwind v4. Hash router (`src/router.ts`), GitHub Pages at `https://mark-stessl.github.io/afterglow/`, deployed by `.github/workflows/deploy.yml` on push to `main`.
- Rooms are defined once in `src/rooms.ts`. The flat building overview (`src/components/Building.tsx`) is also the fallback the 3D building replaces later.
- Design tokens ("Late Show" palette, fonts, room light colours) live in `src/index.css` under `@theme`. Use the tokens, no raw hex in components except scene/art colours.
- Icons: `public/icon.svg` is the source; PNGs in `public/icons/` are rendered from it.

## Rules
- The app must be usable before any 3D has loaded. 3D is a lazy chunk, `frameloop="demand"`, reduced-motion fallback. No intro animation.
- 3D only for the overview, entering a room, the "open item" moment and the trophy case. Lists and forms stay flat.
- Always check the phone layout (390 px): bottom nav, sheets, safe areas.
- Show a preview before bigger visual changes.
- Secrets never go in the repo (sync key, NPSSO, Steam key, VAPID).
- Tried and removed in Nightshelf, do not bring back without asking: start intro, starry sky in stats, page-flipping wall calendar.
