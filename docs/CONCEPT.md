# Afterglow: concept

Same ground as Nightshelf (games, movies, series, anime, manga, trophies, stats, calendar, PSN/Steam sync, worker, PWA, no accounts). New idea for the UI: **every category is a place you walk into**, and every item looks like the physical thing it is.

---

## 1. The overview: one building at night

One 3D scene instead of five separate ones: a **building at night, cut open like a dollhouse**. Each floor is one lit room. That ties the five sceneries together and gives the app one look.

| Floor | Room | What it opens | Light colour |
|---|---|---|---|
| 5 | **Trophy room** (attic) | Trophies, stats, calendar | gold / cyan |
| 4 | **Cinema** | Movies | warm amber |
| 3 | **Game room** | Games (PS5, PS4, Switch, PC/Steam) | cool blue |
| 2 | **Living room** | Series and anime (two TV channels) | purple |
| 1 | **Reading nook** | Manga | yellow lamp light |

- **Hover / tap a room:** its light turns up, the others dim, the name shows.
- **Click a room:** the camera flies in (≈ 700 ms) and the room's own UI fades in on top of it.
- **Phone:** the building is tall and narrow, so **swipe up/down moves floor to floor**; tap to enter. Bottom nav stays as a quick jump.
- **Small life in the scene:** the TV flickers, the projector beam has dust, a trophy glints now and then. Only one or two things move at a time.

---

## 2. The rooms

### Cinema (movies)
- Small cinema: rows of seats, curtain, big **screen (Leinwand)**, projector in the back.
- **Enter:** camera moves to the screen, curtain opens, the screen fades into the movie library (the library is shown on/through the screen).
- **Library:** movies as **Blu-ray cases** on a dark row, sorted by status (Watchlist, Watched, Favourites).
- **Open a movie:** curtain closes, opens again, the screen "plays" the cover: projector flicker on start, slow pan over the cover (Ken Burns), letterbox bars, light grain. Info (year, rating, notes, runtime) runs below like credits.

### Game room (games)
- Shelf/TV board with the consoles: **PS5, PS4, Switch, PC / Steam Deck**. Stylised low-poly models we build ourselves (no logos).
- **Click a console:** its library opens (filtered by platform), plus an "All games" view.
- **Open a game:**
  - **PS5 / PS4:** the disc slides out of the drive, the game case with cover floats up next to it.
  - **Switch:** the cartridge pops out of the slot, the screen lights up with the cover.
  - **PC:** monitor wakes up, cover as a big-box on the desk.
- Game detail: trophies, playtime, progress ring, PSN/Steam sync state.

### Living room (series and anime)
- Sofa, TV, a remote on the table.
- **Two channels: Series and Anime.** Switching between them = channel zap with a short static noise.
- **Open a show:** TV shows the cover full-screen, the season tabs look like a **TV guide**, episode counter as "S2 · E7".
- "+3 new episodes" shows as a small blinking LED on the TV / remote.

### Reading nook (manga)
- Armchair, reading lamp, stacks of manga, a low shelf.
- **Library:** spines on the shelf (**tankōbon** look with volume numbers). Toggle to grid with covers.
- **Open a manga:** the book tips out of the shelf and opens; chapter progress is a **bookmark ribbon**; new chapters as a little sticky note.

### Trophy room (trophies, stats, calendar)
Three stations in one attic room:
- **Display case (Vitrine) in 3D:** platinum cups on glass shelves, each with the game cover as a medal. Orbit/drag to look, click a cup → that game's trophy list. Glass reflection, soft spotlights.
- **Stats = scoreboard:** an arcade-style **LED scoreboard** on the wall: trophy level, platinum count, hours played, episodes watched, chapters read. Click → full stats page and year review (story image share stays).
- **Calendar = departure board:** upcoming episodes, season starts, movie and game releases on a **split-flap board** ("Departures") with time and type. Click → month / week / list.
  - Note: the wall calendar with page-flipping was removed in Nightshelf. The board is a different idea (no page turning, it is a list that updates), but we show a preview first.

---

## 3. Covers that look like the real thing

| Type | Look |
|---|---|
| Movie | **Blu-ray keep case**: clear blue top band, rounded case edge, slight plastic sheen. 4K = black case. |
| Series | **Season slipcase / box set**: spine with "S1, S2 …", the box is a bit wider per season count. |
| Anime | **Japanese Blu-ray with obi**: a vertical paper band on the left with title and volume. |
| Game PS5 | white top band, blue base case |
| Game PS4 | blue top band |
| Game Switch | red case, small cartridge icon |
| Game PC / Steam | dark big-box (thicker, cardboard edge) |
| Manga | **tankōbon**: paper texture, page edges visible on the right, spine with volume number, small obi band. |
| Trophy | metal medal / cup in bronze, silver, gold, platinum |
| Stats tile | LED digits on a dark panel |
| Calendar entry | split-flap row or a **ticket stub** (cinema ticket for movie releases) |

All covers are built in **CSS/SVG around the real cover image**, so they stay sharp and cheap. In the 3D scenes the same image goes on a 3D case.

---

## 4. Lessons from Nightshelf (so it does not get slow or messy again)

Nightshelf already removed: the start intro (slow loading), 3D "shelf worlds" as category picker, the starry sky in stats, the flip wall calendar. So this time:

1. **The app must be usable before any 3D has loaded.** The overview first shows a still image of the building (a rendered poster), the 3D swaps in when ready. No intro animation.
2. **3D only where it adds something**: overview, room entry, the "open item" moment, the vitrine. Lists, forms, settings stay flat and fast.
3. **3D code is a separate lazy chunk.** First load target: < 300 KB JS.
4. `frameloop="demand"`: the scene only renders when something moves, battery stays fine on the phone.
5. **Reduced motion / low-power mode:** cross-fades instead of camera flights, flat illustrated overview.
6. **Preview before big visual steps** (same rule as before).

---

## 5. Colours: "Late Show"

Neutral ink black so the real covers stand out, warm cinema amber as the main accent. Each room adds its own light colour.

| Role | Colour |
|---|---|
| Background | `#0A0A0F` |
| Surface | `#14141C` |
| Border | `#262633` |
| Text | `#ECEAF2` |
| Accent (amber) | `#F5B544` |
| Danger (velvet red) | `#E5484D` |

| Room light | Colour |
|---|---|
| Cinema | `#F5B544` |
| Game room | `#5B8CFF` |
| Living room | `#A77BFF` |
| Reading nook | `#FFD66B` |
| Trophy room | `#5EEAD4` |

Fonts: Space Grotesk for headings, Inter for text (as in Nightshelf).

---

## 6. Tech

- **Vite + React + TypeScript** (TypeScript this time: the data model is big enough that it will catch real mistakes).
- **3D:** three.js via **react-three-fiber** + **drei** (camera controls, environment light, text). Models: built from primitives / modelled in Blender by us, exported as compressed `.glb` (Draco/KTX2). No downloaded console models with logos.
- **Motion:** `motion` for UI, camera tweens in r3f.
- **Styling:** Tailwind v4 with its own design tokens, fresh (no legacy CSS).
- **Data:** port the Nightshelf logic (`store`, `lookup`, `psn`, `steam`, `sync`, `airing`, `trophies`) to TypeScript, keep `localStorage`, keep the same Cloudflare worker at first. **Import of a Nightshelf backup JSON** on day one, so no data is lost.
- **Hosting:** GitHub Pages via GitHub Actions, PWA as before.

---

## 7. Build order

1. **Setup:** repo, Vite/TS/Tailwind, Pages deploy, design tokens, icon.
2. **Data layer:** port Nightshelf logic, backup import, tests for the store.
3. **Flat app first:** all lists, details, forms working without 3D, with the new cover styles. (The app is fully usable here.)
4. **Overview building:** poster image + 3D building, room hover/enter.
5. **Cinema** (first room, sets the bar for the others).
6. **Game room**, then **living room**, then **reading nook**.
7. **Trophy room:** vitrine, scoreboard, departure board.
8. **Polish:** PWA, phone gestures, reduced motion, performance pass.
