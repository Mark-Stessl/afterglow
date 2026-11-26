export type RoomId = 'trophies' | 'cinema' | 'games' | 'living' | 'reading';

export interface Room {
  id: RoomId;
  name: string;
  /** What the room holds, shown under the name. */
  holds: string;
  /** CSS colour of the room light (a theme token). */
  light: string;
}

/** Top floor first, the order the building is drawn in. */
export const ROOMS: Room[] = [
  { id: 'trophies', name: 'Trophy room', holds: 'Trophies, stats, calendar', light: 'var(--color-room-trophies)' },
  { id: 'cinema', name: 'Cinema', holds: 'Movies', light: 'var(--color-room-cinema)' },
  { id: 'games', name: 'Game room', holds: 'Games', light: 'var(--color-room-games)' },
  { id: 'living', name: 'Living room', holds: 'Series and anime', light: 'var(--color-room-living)' },
  { id: 'reading', name: 'Reading nook', holds: 'Manga', light: 'var(--color-room-reading)' },
];

export const roomById = (id: string) => ROOMS.find(r => r.id === id);
