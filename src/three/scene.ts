import type { RoomId } from '../rooms';
import { ROOMS } from '../rooms';

/** Room height and depth (metres). Each room is open at the front, like a cut-away model. */
export const H = 4.5;
export const D = 5.4;
/** Dark gap between two rooms. */
export const GAP = 1.1;
/** Rooms are modelled 5.4 m deep and squashed in depth when shown: from the front the furniture
 *  still reads right, and the back wall comes forward like in the reference. */
export const DEPTH = 0.62;

/** Width of each room, so the front opening has the proportions of the reference render. */
export const WIDTH: Record<RoomId, number> = { cinema: 5.1, games: 4.25, living: 4.5, reading: 4.35, trophies: 4.5 };

/** Centre x of every room, left to right with a gap between them. */
export const CENTER: number[] = (() => {
  const out: number[] = [];
  let x = 0;
  ROOMS.forEach((r, i) => {
    if (i > 0) x += WIDTH[ROOMS[i - 1].id] / 2 + GAP + WIDTH[r.id] / 2;
    out.push(x);
  });
  const mid = (out[0] + out[out.length - 1]) / 2;
  return out.map(v => v - mid);
})();

/** x at a fractional room position (0 = cinema, 4 = trophy room), for smooth camera moves. */
export function xAt(pos: number) {
  const i = Math.max(0, Math.min(CENTER.length - 1, pos));
  const a = Math.floor(i), b = Math.min(CENTER.length - 1, a + 1);
  return CENTER[a] + (CENTER[b] - CENTER[a]) * (i - a);
}

/** Room light colours as hex (three.js cannot read CSS variables). */
export const LIGHT: Record<RoomId, string> = {
  cinema: '#F5B544', games: '#5B8CFF', living: '#A77BFF', reading: '#FFD66B', trophies: '#5EEAD4',
};
