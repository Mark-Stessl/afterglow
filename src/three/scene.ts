import type { RoomId } from '../rooms';

/** One room: width (x), depth (z), height (y), in metres. */
export const ROOM = { W: 4.4, D: 3.2, H: 3.0 } as const;
/** Wall thickness between rooms. */
export const WALL = 0.16;
export const STEP = ROOM.W + WALL;
export const COUNT = 5;
export const TOTAL_W = COUNT * ROOM.W + (COUNT + 1) * WALL;

/** Centre x of room i (rooms run left to right, the middle one at 0). */
export const roomX = (i: number) => (i - (COUNT - 1) / 2) * STEP;

/** Room light colours as hex (same values as the CSS tokens; three.js cannot read CSS variables). */
export const LIGHT: Record<RoomId, string> = {
  cinema: '#F5B544',
  games: '#5B8CFF',
  living: '#A77BFF',
  reading: '#FFD66B',
  trophies: '#5EEAD4',
};
