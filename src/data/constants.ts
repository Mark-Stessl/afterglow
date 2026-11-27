import type { ItemType, Status } from './types';

export const TYPES: Record<ItemType, { label: string; plural: string }> = {
  game: { label: 'Game', plural: 'Games' },
  series: { label: 'Series', plural: 'Series' },
  anime: { label: 'Anime', plural: 'Anime' },
  manga: { label: 'Manga', plural: 'Manga' },
  movie: { label: 'Movie', plural: 'Movies' },
};
export const ORDER_TYPES: ItemType[] = ['movie', 'game', 'series', 'anime', 'manga'];

export const STATUS: Record<ItemType, Partial<Record<Status, string>>> = {
  game: { active: 'Playing', done: 'Finished', planned: 'Backlog', dropped: 'Dropped' },
  series: { active: 'Watching', done: 'Finished', planned: 'Watchlist', dropped: 'Dropped' },
  anime: { active: 'Watching', done: 'Finished', paused: 'Paused', planned: 'Watchlist', dropped: 'Dropped' },
  manga: { active: 'Reading', done: 'Finished', paused: 'Paused', planned: 'Reading list', dropped: 'Dropped' },
  movie: { active: 'Watching', done: 'Watched', planned: 'Watchlist', dropped: 'Dropped' },
};

/** Platforms grouped by maker, for pickers and filters. */
export const PLATFORM_GROUPS: [string, string[]][] = [
  ['PlayStation', ['PS5', 'PS4', 'PS3', 'PS2', 'PS1', 'PS Vita', 'PSP']],
  ['Nintendo', ['Switch 2', 'Switch', 'Wii U', 'Wii', 'GameCube', '3DS', 'DS', 'N64']],
  ['Xbox', ['Xbox Series', 'Xbox One', 'Xbox 360', 'Xbox']],
  ['Steam', ['Steam']],
  ['Other', ['Mobile', 'Andere', 'Other']],
];
export const PLATFORMS = PLATFORM_GROUPS.flatMap(([, list]) => list);
const LEGACY_FAMILY: Record<string, string> = { PC: 'Steam', 'Steam Deck': 'Steam' };
export const familyOf = (p?: string) =>
  (p && LEGACY_FAMILY[p]) || (PLATFORM_GROUPS.find(([, list]) => p && list.includes(p)) || ['Other'])[0];
/** Platforms with official PlayStation trophies. */
export const isPS = (p?: string) => /^(PS5|PS4|PS3|PS Vita)$/.test(p || '');
