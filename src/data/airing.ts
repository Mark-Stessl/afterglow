/**
 * Airing data: which episodes are out and what comes next.
 * Anime from AniList (nextAiringEpisode, airingSchedule), series from TVmaze (episode list with air times).
 */
import { anilist } from './lookup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const alDate = (d: J) => d?.year && d?.month && d?.day ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null;
const iso = (sec: number) => new Date(sec * 1000).toISOString();

export interface AnimeAiring {
  status: string; episodes: number | null; aired: number | null; start: string | null;
  next: { ep: number; at: string } | null; schedule: { ep: number; at: string }[];
}

/** Status of several AniList entries: released episodes and next dates. */
export async function anime(ids: number[]) {
  const out = new Map<number, AnimeAiring>();
  const q = `query($ids: [Int], $page: Int) { Page(page: $page, perPage: 50) { media(id_in: $ids, type: ANIME) {
    id status format episodes startDate { year month day }
    nextAiringEpisode { episode airingAt }
    airingSchedule(notYetAired: true, perPage: 6) { nodes { episode airingAt } } } } }`;
  for (let i = 0; i < ids.length; i += 50) {
    const d = await anilist(q, { ids: ids.slice(i, i + 50), page: 1 });
    (d?.Page?.media || []).forEach((m: J) => {
      const next = m.nextAiringEpisode;
      const aired = next ? Math.max(0, next.episode - 1) : m.status === 'FINISHED' ? (m.episodes || null) : m.status === 'NOT_YET_RELEASED' ? 0 : null;
      out.set(m.id, {
        status: m.status, episodes: m.episodes || null, aired, start: alDate(m.startDate),
        next: next ? { ep: next.episode, at: iso(next.airingAt) } : null,
        schedule: (m.airingSchedule?.nodes || []).map((n: J) => ({ ep: n.episode, at: iso(n.airingAt) })),
      });
    });
    if (i + 50 < ids.length) await sleep(800);
  }
  return out;
}

export interface Sequel { anilistId: number; title: string; format: string; episodes: number | null; year: number | null; start: string | null; airing: string; cover: string }

/** Sequels (new seasons, movies) of the given last seasons. */
export async function animeSequels(ids: number[]) {
  const out = new Map<number, Sequel[]>();
  const q = `query($ids: [Int]) { Page(perPage: 25) { media(id_in: $ids, type: ANIME) { id relations { edges { relationType node {
    id type format status episodes title { romaji english } startDate { year month day } coverImage { extraLarge large } } } } } } }`;
  for (let i = 0; i < ids.length; i += 25) {
    const d = await anilist(q, { ids: ids.slice(i, i + 25) });
    (d?.Page?.media || []).forEach((m: J) => {
      out.set(m.id, (m.relations?.edges || [])
        .filter((e: J) => e.relationType === 'SEQUEL' && e.node.type === 'ANIME' && ['TV', 'TV_SHORT', 'ONA', 'MOVIE'].includes(e.node.format))
        .map((e: J) => ({
          anilistId: e.node.id, title: e.node.title?.english || e.node.title?.romaji, format: e.node.format, episodes: e.node.episodes || null,
          year: e.node.startDate?.year || null, start: alDate(e.node.startDate), airing: e.node.status, cover: e.node.coverImage?.extraLarge || e.node.coverImage?.large || '',
        })));
    });
    if (i + 25 < ids.length) await sleep(800);
  }
  return out;
}

/** One series from TVmaze: seasons with released episodes, and upcoming air dates. */
export async function series(showId: number): Promise<{
  status: string;
  seasons: { tvmazeId: number; number: number; name: string; premiere: string | null; episodes: number | null; aired: number; cover: string }[];
  upcoming: { at: string; season: number; ep: number; name: string; dateOnly: boolean }[];
}> {
  const r = await fetch(`https://api.tvmaze.com/shows/${showId}?embed[]=episodes&embed[]=seasons`);
  if (r.status === 429) { await sleep(3000); return series(showId); }
  if (!r.ok) throw new Error('tvmaze');
  const s = await r.json();
  const now = Date.now();
  const eps: J[] = (s._embedded?.episodes || []).filter((e: J) => e.type !== 'insignificant_special');
  const stamp = (e: J) => e.airstamp ? Date.parse(e.airstamp) : e.airdate ? Date.parse(e.airdate + 'T20:00:00Z') : NaN;
  const seasons = (s._embedded?.seasons || []).filter((x: J) => x.premiereDate || eps.some(e => e.season === x.number)).map((x: J) => {
    const own = eps.filter(e => e.season === x.number);
    return {
      tvmazeId: x.id, number: x.number, name: x.name || '', premiere: x.premiereDate || null,
      episodes: Math.max(x.episodeOrder || 0, own.length) || null,
      aired: own.filter(e => stamp(e) <= now).length,
      cover: x.image?.original || x.image?.medium || '',
    };
  });
  const upcoming = eps.filter(e => stamp(e) > now).sort((a, b) => stamp(a) - stamp(b)).slice(0, 8)
    .map(e => ({ at: new Date(stamp(e)).toISOString(), season: e.season, ep: e.number, name: e.name || '', dateOnly: !e.airstamp }));
  return { status: s.status, seasons, upcoming };
}
