/**
 * Automatic details when adding: TVmaze (series), TMDB (movies, own free key),
 * Wikipedia/Wikidata (games), AniList (anime), MangaDex via the worker (manga).
 */
import type { GenreKey, Item, ItemType, Season } from './types';
import { lsJSON, lsMerge, workerFetch } from './worker';

// External API responses are loosely shaped; they are mapped to typed results right here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

export interface Hit {
  source: 'tvmaze' | 'tmdb' | 'wikipedia' | 'anilist' | 'mangadex';
  id: number | string;
  qid?: string;
  title: string;
  year: number | null;
  cover: string;
  thumb: string;
  sub: string;
  raw?: J;
}
export type Detail = Partial<Item> & { platforms?: string[]; latest?: number; completed?: boolean };

const KEYS = 'afterglow.keys';
export const keys = () => lsJSON<{ tmdb: string }>(KEYS);
export const setKeys = (k: { tmdb?: string }) => lsMerge(KEYS, k);

const yearOf = (d?: string | null) => (d && /^\d{4}/.test(d)) ? +d.slice(0, 4) : null;
const strip = (html?: string) => (html || '').replace(/<[^>]+>/g, '').trim();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getJSON(url: string, init?: RequestInit): Promise<J> {
  const r = await fetch(url, init);
  if (r.status === 401 || r.status === 403) throw new Error('key');
  if (!r.ok) throw new Error('http');
  return r.json();
}

/* ---------- Series: TVmaze ---------- */

async function searchSeries(q: string): Promise<Hit[]> {
  const data: J[] = await getJSON(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
  return data.slice(0, 6).map(({ show }) => ({
    source: 'tvmaze', id: show.id, title: show.name,
    year: yearOf(show.premiered), cover: show.image?.original || show.image?.medium || '', thumb: show.image?.medium || '',
    sub: [yearOf(show.premiered), (show.genres || []).slice(0, 2).join(', '), show.network?.name || show.webChannel?.name].filter(Boolean).join(' · '),
  }));
}

export async function seriesSeasons(showId: number, fallbackCover = ''): Promise<Omit<Season, 'id'>[]> {
  const seasons: J[] = (await getJSON(`https://api.tvmaze.com/shows/${showId}/seasons`)).filter((x: J) => x.premiereDate);
  const out: Omit<Season, 'id'>[] = [];
  for (const x of seasons) {
    let episodes = x.episodeOrder || null;
    if (!episodes) {
      const eps: J[] = await getJSON(`https://api.tvmaze.com/seasons/${x.id}/episodes`).catch(() => []);
      episodes = eps.filter(e => e.type !== 'insignificant_special').length || null;
    }
    out.push({ tvmazeId: x.id, label: `Season ${x.number}`, title: x.name || '', episodes, year: yearOf(x.premiereDate), cover: x.image?.original || x.image?.medium || fallbackCover || '', format: 'TV' });
  }
  return out;
}

async function detailSeries(hit: Hit): Promise<Detail> {
  const list = await seriesSeasons(+hit.id, hit.cover).catch(() => []);
  const show = await getJSON(`https://api.tvmaze.com/shows/${hit.id}`).catch(() => ({}));
  return {
    title: hit.title, year: hit.year, cover: hit.cover,
    seasonList: list.map((x, i) => ({ ...x, id: `tvmaze-${x.tvmazeId ?? i}` })),
    seasons: list.length || null, genres: show.genres || [], released: show.premiered || null,
    summary: strip(show.summary), external: `tvmaze:${hit.id}`,
  };
}

/* ---------- Movies: TMDB ---------- */

function tmdbOpts() {
  const k = (keys().tmdb || '').trim();
  if (!k) return null;
  return k.length > 60
    ? { qs: '', init: { headers: { Authorization: `Bearer ${k}`, accept: 'application/json' } } }
    : { qs: `api_key=${encodeURIComponent(k)}&`, init: {} };
}
const tmdbImg = (p?: string, size = 'w500') => p ? `https://image.tmdb.org/t/p/${size}${p}` : '';

async function searchMovies(q: string): Promise<Hit[]> {
  const o = tmdbOpts();
  if (!o) throw new Error('nokey');
  const data = await getJSON(`https://api.themoviedb.org/3/search/movie?${o.qs}language=en-US&query=${encodeURIComponent(q)}`, o.init);
  return (data.results || []).slice(0, 6).map((m: J) => ({
    source: 'tmdb', id: m.id, title: m.title, year: yearOf(m.release_date),
    cover: tmdbImg(m.poster_path), thumb: tmdbImg(m.poster_path, 'w92'),
    sub: [yearOf(m.release_date), m.original_title !== m.title ? m.original_title : ''].filter(Boolean).join(' · '),
  }));
}
async function detailMovie(hit: Hit): Promise<Detail> {
  const o = tmdbOpts();
  const m = o ? await getJSON(`https://api.themoviedb.org/3/movie/${hit.id}?${o.qs}language=en-US`, o.init).catch(() => ({})) : {};
  return {
    title: hit.title, year: hit.year, cover: hit.cover,
    genres: (m.genres || []).map((g: J) => g.name), runtime: m.runtime || null,
    released: m.release_date || null, summary: m.overview || '', external: `tmdb:${hit.id}`,
  };
}

/* ---------- Games: Wikipedia + Wikidata (no key) ---------- */

const PLATFORM_MAP: [RegExp, string][] = [
  [/^playstation 5$/i, 'PS5'], [/^playstation 4$/i, 'PS4'], [/^playstation 3$/i, 'PS3'], [/^playstation 2$/i, 'PS2'], [/^playstation( \(console\))?$/i, 'PS1'],
  [/playstation vita/i, 'PS Vita'], [/playstation portable/i, 'PSP'],
  [/nintendo switch 2/i, 'Switch 2'], [/^nintendo switch$/i, 'Switch'], [/^wii u$/i, 'Wii U'], [/^wii$/i, 'Wii'], [/gamecube/i, 'GameCube'],
  [/nintendo 3ds/i, '3DS'], [/^nintendo ds$/i, 'DS'], [/nintendo 64/i, 'N64'],
  [/xbox series/i, 'Xbox Series'], [/^xbox one$/i, 'Xbox One'], [/^xbox 360$/i, 'Xbox 360'], [/^xbox( \(console\))?$/i, 'Xbox'],
  [/^(steam|steam deck|microsoft windows|linux|macos)$/i, 'Steam'], [/^(ios|android)$/i, 'Mobile'],
];
const GENRE_RULES: [RegExp, GenreKey][] = [
  [/role-playing/i, 'rpg'], [/platform game|platformer/i, 'platformer'], [/shooter/i, 'shooter'], [/racing|kart/i, 'racing'],
  [/sports|football|basketball|golf|tennis/i, 'sports'], [/fighting|beat 'em up/i, 'fighting'], [/strategy|tactics|4x/i, 'strategy'],
  [/puzzle/i, 'puzzle'], [/horror/i, 'horror'], [/sandbox|survival game|city-building|crafting/i, 'sandbox'], [/party/i, 'party'],
  [/simulation|life sim|farming/i, 'sim'], [/adventure|hack and slash|action game|metroidvania|soulslike|stealth/i, 'adventure'],
];
const WIKI = 'https://en.wikipedia.org/w/api.php?format=json&origin=*';
const WD = 'https://www.wikidata.org/w/api.php?format=json&origin=*';
const cleanTitle = (t: string) => t.replace(/\s*\((?:\d{4} )?video game\)$/i, '').trim();

async function searchGames(q: string): Promise<Hit[]> {
  const url = `${WIKI}&action=query&generator=search&gsrsearch=${encodeURIComponent(q + ' video game')}&gsrlimit=12&prop=pageimages|description|pageprops&piprop=thumbnail&pithumbsize=600&pilicense=any&ppprop=wikibase_item`;
  const data = await getJSON(url);
  const pages: J[] = Object.values(data.query?.pages || {}).sort((a: J, b: J) => a.index - b.index);
  return pages
    .filter(p => /video game|\bgame\b/i.test(p.description || '') && !/series|film|novel|character|franchise|album|soundtrack|award|show|esports|tournament|company|developer|engine/i.test(p.description || ''))
    .slice(0, 6)
    .map(p => {
      const y = (p.description || '').match(/(19|20)\d{2}/);
      const img = (p.thumbnail?.source || '').replace(/\?utm_.*$/, '');
      return { source: 'wikipedia', id: p.pageid, qid: p.pageprops?.wikibase_item, title: cleanTitle(p.title), year: y ? +y[0] : null, cover: img, thumb: img, sub: p.description || '' };
    });
}

async function detailGame(hit: Hit): Promise<Detail> {
  const out: Detail & { platforms: string[] } = { title: hit.title, year: hit.year, cover: hit.cover, platforms: [], genre: 'other', genres: [], released: null, external: `wikidata:${hit.qid || hit.id}` };
  if (!hit.qid) return out;
  const e = await getJSON(`${WD}&action=wbgetentities&ids=${hit.qid}&props=claims`).catch(() => null);
  const c = e?.entities?.[hit.qid]?.claims || {};
  const ids = (arr: J[]) => (arr || []).map(x => x.mainsnak?.datavalue?.value?.id).filter(Boolean) as string[];
  const dates = (c.P577 || []).map((x: J) => x.mainsnak?.datavalue?.value?.time).filter(Boolean).sort();
  if (dates[0]) {
    const d = dates[0].replace(/^\+/, '').slice(0, 10);
    out.released = d.endsWith('-00-00') ? null : d.replace(/-00$/, '-01');
    out.year = +d.slice(0, 4);
  }
  const pIds = ids(c.P400), gIds = ids(c.P136);
  const all = [...new Set([...pIds, ...gIds])].slice(0, 50);
  if (all.length) {
    const l = await getJSON(`${WD}&action=wbgetentities&ids=${all.join('|')}&props=labels&languages=en&languagefallback=1`).catch(() => null);
    const label = (id: string): string => l?.entities?.[id]?.labels?.en?.value || '';
    pIds.map(label).forEach(n => { const p = PLATFORM_MAP.find(([re]) => re.test(n)); if (p && !out.platforms.includes(p[1])) out.platforms.push(p[1]); });
    out.genres = gIds.map(label).filter(Boolean);
    const g = GENRE_RULES.find(([re]) => out.genres!.some(n => re.test(n)));
    if (g) out.genre = g[1];
  }
  return out;
}

/* ---------- Anime: AniList (no key) ---------- */

const ANILIST = 'https://graphql.anilist.co';
const AL_FIELDS = 'id title { romaji english } coverImage { extraLarge large } startDate { year month day } episodes genres format description(asHtml: false)';
let onRateLimit: ((seconds: number) => void) | null = null;
export const setOnRateLimit = (fn: typeof onRateLimit) => { onRateLimit = fn; };

export async function anilist(query: string, variables: J, attempt = 0): Promise<J> {
  const r = await fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (r.status === 429 && attempt < 4) {
    const wait = Math.min(90, +(r.headers.get('Retry-After') || 60));
    onRateLimit?.(wait);
    await sleep(wait * 1000 + 500);
    return anilist(query, variables, attempt + 1);
  }
  const j = await r.json().catch(() => null);
  if (!j || (!r.ok && !j.data)) throw new Error('http');
  return j.data;
}
const alDate = (d: J) => d?.year ? `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}` : null;
const FORMAT: Record<string, string> = { TV: 'TV', TV_SHORT: 'TV short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };

function alToDetail(m: J): Detail {
  return {
    title: m.title?.english || m.title?.romaji, year: m.startDate?.year || null,
    cover: m.coverImage?.extraLarge || m.coverImage?.large || '', episodes: m.episodes || null,
    genres: m.genres || [], released: alDate(m.startDate), summary: strip(m.description).replace(/\s+/g, ' ').slice(0, 3000),
    external: `anilist:${m.id}`, anilistId: m.id,
  };
}
const REL_SKIP = ['CHARACTER', 'OTHER', 'ADAPTATION', 'SOURCE'];
const relatedOf = (m: J): number[] => (m?.relations?.edges || []).filter((e: J) => e.node.type === 'ANIME' && !REL_SKIP.includes(e.relationType)).map((e: J) => e.node.id);

export async function animeRelatedIds(id: number) {
  const d = await anilist(`query($id: Int) { Media(id: $id, type: ANIME) { relations { edges { relationType node { id type } } } } }`, { id });
  return relatedOf(d?.Media);
}
async function searchAnime(q: string): Promise<Hit[]> {
  const d = await anilist(`query($q: String) { Page(perPage: 6) { media(search: $q, type: ANIME, sort: SEARCH_MATCH) { ${AL_FIELDS} } } }`, { q });
  return (d?.Page?.media || []).map((m: J) => ({
    source: 'anilist', id: m.id, title: m.title?.english || m.title?.romaji, year: m.startDate?.year || null,
    cover: m.coverImage?.extraLarge || '', thumb: m.coverImage?.large || '', raw: m,
    sub: [m.startDate?.year, FORMAT[m.format] || m.format, m.episodes ? `${m.episodes} episodes` : '', m.title?.english && m.title?.romaji !== m.title.english ? m.title.romaji : ''].filter(Boolean).join(' · '),
  }));
}
export async function animeByIds(ids: number[]) {
  const out = new Map<number, Detail>();
  for (let i = 0; i < ids.length; i += 50) {
    const d = await anilist(`query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ${AL_FIELDS} } } }`, { ids: ids.slice(i, i + 50) });
    (d?.Page?.media || []).forEach((m: J) => out.set(m.id, alToDetail(m)));
    if (i + 50 < ids.length) await sleep(700);
  }
  return out;
}

const SEASON_FORMATS = ['TV', 'TV_SHORT', 'ONA', 'MOVIE'];

/** All seasons of an anime series (prequel/sequel chain) plus linked movies, in order. */
export async function animeSeasons(startId: number): Promise<Omit<Season, 'id'>[]> {
  const q = `query($id: Int) { Media(id: $id, type: ANIME) { id title { romaji english } format episodes startDate { year month day } coverImage { extraLarge large }
    relations { edges { relationType node { id type format } } } } }`;
  const cache = new Map<number, J>();
  const get = async (id: number) => {
    if (!cache.has(id)) { cache.set(id, (await anilist(q, { id }))?.Media || null); await sleep(250); }
    return cache.get(id);
  };
  const link = (m: J, type: string): number | undefined =>
    (m?.relations?.edges || []).find((e: J) => e.relationType === type && e.node.type === 'ANIME' && SEASON_FORMATS.includes(e.node.format))?.node.id;
  let first = await get(startId);
  if (!first) return [];
  for (let i = 0; i < 12; i++) { const prev = link(first, 'PREQUEL'); if (!prev || cache.has(prev)) break; const p = await get(prev); if (!p) break; first = p; }
  const chain: J[] = [first];
  for (let i = 0; i < 20; i++) { const next = link(chain[chain.length - 1], 'SEQUEL'); if (!next || chain.some(m => m.id === next)) break; const n = await get(next); if (!n) break; chain.push(n); }
  const inChain = new Set(chain.map(m => m.id));
  const extraIds = [...new Set(chain.flatMap(m => (m.relations?.edges || [])
    .filter((e: J) => e.node.type === 'ANIME' && e.node.format === 'MOVIE' && !REL_SKIP.includes(e.relationType) && !inChain.has(e.node.id))
    .map((e: J) => e.node.id as number)))].slice(0, 50);
  let extras: J[] = [];
  if (extraIds.length) {
    try {
      const d = await anilist(`query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id title { romaji english } format episodes startDate { year month day } coverImage { extraLarge large } } } }`, { ids: extraIds });
      extras = d?.Page?.media || [];
    } catch { /* movies are a bonus */ }
  }
  const toSeason = (m: J) => ({ anilistId: m.id, title: m.title?.english || m.title?.romaji, format: m.format, episodes: m.episodes || null,
    year: m.startDate?.year || null, cover: m.coverImage?.extraLarge || m.coverImage?.large || '', _d: m.startDate });
  const dateKey = (x: J) => [x._d?.year || 9999, x._d?.month || 12, x._d?.day || 31].map(n => String(n).padStart(4, '0')).join('-');
  const shows = chain.filter(m => m.format !== 'MOVIE').map(toSeason);
  const movies = [...chain.filter(m => m.format === 'MOVIE'), ...extras].map(toSeason).sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
  return [
    ...shows.map(({ _d, ...x }, i) => ({ ...x, label: `Season ${i + 1}` })),
    ...movies.map(({ _d, ...x }, i) => ({ ...x, label: movies.length > 1 ? `Movie ${i + 1}` : 'Movie' })),
  ];
}

/* ---------- Manga: MangaDex through the worker ---------- */

const MD_STATUS: Record<string, string> = { ongoing: 'ongoing', completed: 'completed', hiatus: 'on hiatus', cancelled: 'cancelled' };
async function searchManga(q: string): Promise<Hit[]> {
  const d = await workerFetch<{ results: J[] }>(`/manga/search?q=${encodeURIComponent(q)}`);
  return (d.results || []).map(m => ({
    source: 'mangadex', id: m.id, title: m.title, year: m.year, cover: m.cover, thumb: m.thumb, raw: m,
    sub: [m.kind, m.year, MD_STATUS[m.status] || m.status, m.altTitle].filter(Boolean).join(' · '),
  }));
}
async function detailManga(hit: Hit): Promise<Detail> {
  const d = await workerFetch<J>(`/manga/series?id=${hit.id}`);
  return {
    title: d.title || hit.title, year: d.year, cover: d.cover || hit.cover, genres: d.genres || [], summary: d.summary || '',
    latest: d.latest, completed: d.completed, mdStatus: d.status, lastUpload: d.lastUpload, kind: d.kind, authors: d.authors || [],
    mangadexId: d.id || hit.id, external: `mangadex:${d.id || hit.id}`,
  };
}

/* ---------- Entry points ---------- */

const SEARCH: Record<ItemType, (q: string) => Promise<Hit[]>> = { series: searchSeries, movie: searchMovies, game: searchGames, anime: searchAnime, manga: searchManga };
const DETAIL: Record<ItemType, (h: Hit) => Promise<Detail>> = { series: detailSeries, movie: detailMovie, game: detailGame, anime: async h => alToDetail(h.raw), manga: detailManga };

export const hasKey = (type: ItemType) => type !== 'movie' || !!(keys().tmdb || '').trim();
export const search = (type: ItemType, q: string) => SEARCH[type](q);
export const detail = (type: ItemType, hit: Hit) => DETAIL[type](hit);
