import type { ItemType } from './data/types';

export type RoomId = 'trophies' | 'cinema' | 'games' | 'living' | 'reading';

export interface Room {
  id: RoomId;
  name: string;
  /** What the room holds, shown under the name. */
  holds: string;
  /** CSS colour of the room light (a theme token). */
  light: string;
  /** Item types that live in this room (none: the trophy room shows trophies). */
  types: ItemType[];
}

/** Left to right, the order the building is drawn in. */
export const ROOMS: Room[] = [
  { id: 'cinema', name: 'Cinema', holds: 'Movies', light: 'var(--color-room-cinema)', types: ['movie'] },
  { id: 'games', name: 'Game room', holds: 'Games', light: 'var(--color-room-games)', types: ['game'] },
  { id: 'living', name: 'Living room', holds: 'Series and anime', light: 'var(--color-room-living)', types: ['series', 'anime'] },
  { id: 'reading', name: 'Reading nook', holds: 'Manga', light: 'var(--color-room-reading)', types: ['manga'] },
  { id: 'trophies', name: 'Trophy room', holds: 'Trophies, stats, calendar', light: 'var(--color-room-trophies)', types: [] },
];

export const roomById = (id: string) => ROOMS.find(r => r.id === id);
