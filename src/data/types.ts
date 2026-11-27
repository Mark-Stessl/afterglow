/**
 * The data model. Field names match Nightshelf exactly, so backups and the
 * shared sync worker work for both apps.
 */

export type ItemType = 'game' | 'series' | 'anime' | 'manga' | 'movie';
export type Status = 'active' | 'done' | 'paused' | 'planned' | 'dropped';
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type GenreKey =
  | 'adventure' | 'rpg' | 'platformer' | 'shooter' | 'racing' | 'sports' | 'fighting'
  | 'strategy' | 'puzzle' | 'horror' | 'sandbox' | 'party' | 'sim' | 'other';

export interface Trophy {
  id: string;
  name: string;
  desc: string;
  tier: Tier;
  done: boolean;
  doneAt?: string | null;
  /** Percentage of players who have it (PSN, Steam, pasted lists). */
  rarity?: number | null;
  /** DLC trophies do not count towards platinum. */
  dlc?: boolean;
  icon?: string;
}

/** AniList media status. */
export type AiringStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';

/** One season (or movie) of a series or anime. */
export interface Season {
  id: string;
  title?: string;
  label?: string;
  /** AniList format; 'MOVIE' marks a movie inside a series. */
  format?: string;
  episodes?: number | null;
  seen?: number;
  complete?: boolean;
  year?: number | null;
  cover?: string;
  anilistId?: number;
  tvmazeId?: number;
  airing?: AiringStatus | string;
  /** Episodes released so far. */
  aired?: number | null;
  start?: string | null;
  nextAt?: string | null;
  newAt?: string | null;
}

export interface Upcoming {
  at: string;
  kind: 'ep' | 'start' | 'movie' | 'game';
  season?: string;
  ep?: number;
  last?: boolean;
  name?: string;
  dateOnly?: boolean;
}

export interface LogEntry { at: string; n: number }

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  status: Status;
  rating?: number;
  notes?: string;
  addedAt: string;
  updatedAt: string;
  finishedAt?: string | null;

  cover?: string;
  coverCustom?: boolean;
  coverTried?: boolean;
  coverV?: number;
  year?: number | null;
  released?: string | null;
  genre?: GenreKey;
  genres?: string[];
  summary?: string;
  external?: string;

  /* games */
  platform?: string;
  trophies?: Trophy[];
  trophySource?: 'psn' | 'steam' | 'paste' | 'auto' | string;
  psnId?: string;
  psnService?: string;
  steamAppId?: number;
  playH?: number | null;
  playMin?: number | null;
  playSrc?: 'steam' | 'psn';
  lastPlayed?: string | null;

  /* series and anime */
  seasons?: number | null;
  seasonSeen?: number;
  seasonList?: Season[];
  episodes?: number | null;
  episodesSeen?: number;
  watchLog?: LogEntry[];
  upcoming?: Upcoming[];
  showStatus?: string;
  anilistId?: number;
  newEpisodeAt?: string | null;
  airCheckedAt?: string | null;
  /** AniList or TVmaze ids of seasons the user deleted: the background check must not add them back. */
  removedSeasons?: number[];

  /* manga */
  chapters?: number | null;
  chaptersRead?: number;
  readLog?: LogEntry[];
  mdStatus?: string;
  mangadexId?: string;
  lastUpload?: string | null;
  newChapterAt?: string | null;
  chapterCheckedAt?: string | null;
  kind?: string;
  authors?: string[];

  /* movies */
  runtime?: number | null;
}

/** Item data before the store gives it an id and timestamps. */
export type NewItem = Omit<Item, 'id' | 'addedAt' | 'updatedAt'> & Partial<Pick<Item, 'id' | 'addedAt'>>;

export interface Tombstone { id: string; at: string }

export interface Snapshot { items: Item[]; deleted: Tombstone[] }
