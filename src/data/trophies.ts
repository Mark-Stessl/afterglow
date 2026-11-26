import { uid } from './store';
import type { GenreKey, Tier, Trophy } from './types';

export const TIERS: Record<Tier, { label: string; points: number; hex: string }> = {
  bronze: { label: 'Bronze', points: 15, hex: '#D08A5B' },
  silver: { label: 'Silver', points: 30, hex: '#C9CEDC' },
  gold: { label: 'Gold', points: 90, hex: '#E9BE58' },
  platinum: { label: 'Platinum', points: 300, hex: '#5EEAD4' },
};
export const TIER_ORDER: Tier[] = ['platinum', 'gold', 'silver', 'bronze'];

/* ---------- Platinum and progress ---------- */

/** Platinum follows the other (non-DLC) trophies. Mutates the list; returns what changed. */
export function syncPlatinum(list: Trophy[]): 'earned' | 'lost' | null {
  const plat = list.find(t => t.tier === 'platinum');
  if (!plat) return null;
  const others = list.filter(t => t.tier !== 'platinum' && !t.dlc);
  const shouldBe = others.length > 0 && others.every(t => t.done);
  if (shouldBe === !!plat.done) return null;
  plat.done = shouldBe;
  plat.doneAt = shouldBe ? new Date().toISOString() : null;
  return shouldBe ? 'earned' : 'lost';
}

export function progress(list: Trophy[] = []) {
  const counts: Record<Tier, [number, number]> = { bronze: [0, 0], silver: [0, 0], gold: [0, 0], platinum: [0, 0] };
  let pts = 0, max = 0;
  list.forEach(t => {
    const tier = TIERS[t.tier] ? t.tier : 'bronze';
    counts[tier][1]++;
    max += TIERS[tier].points;
    if (t.done) { counts[tier][0]++; pts += TIERS[tier].points; }
  });
  const done = list.filter(t => t.done).length;
  return { counts, done, total: list.length, pts, max, pct: max ? Math.round((pts / max) * 100) : 0 };
}

/** Level 1 needs 100 points, every level after that 40 more. */
export function levelFromPoints(points: number) {
  let level = 1, need = 100, rest = points;
  while (rest >= need && level < 999) { rest -= need; level++; need = 100 + (level - 1) * 40; }
  return { level, into: rest, need, pct: Math.round((rest / need) * 100) };
}

/* ---------- Generator (games without official trophies) ---------- */

function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GENRES: Record<GenreKey, string> = {
  adventure: 'Action adventure', rpg: 'Role-playing', platformer: 'Platformer', shooter: 'Shooter',
  racing: 'Racing', sports: 'Sports', fighting: 'Fighting', strategy: 'Strategy',
  puzzle: 'Puzzle', horror: 'Horror', sandbox: 'Sandbox / building', party: 'Party / multiplayer',
  sim: 'Simulation / cosy', other: 'Other',
};

type Tpl = [name: string, desc: string, tier: Exclude<Tier, 'platinum'>];
const BASE: Tpl[] = [
  ['First Step', 'Start your adventure in {t}', 'bronze'],
  ['Roll Credits', 'Finish the main story', 'gold'],
];
const EXTRA: Tpl[] = [
  ['Halfway There', 'Reach the middle of the story', 'bronze'],
  ['Settling In', 'Play for 10 hours in total', 'bronze'],
  ['Marathon', 'Play for 50 hours in total', 'silver'],
  ['Collector', 'Find half of all collectibles', 'silver'],
  ['Nothing Missed', 'Find every collectible', 'gold'],
  ['Completionist', 'Reach 100% completion', 'gold'],
  ['On the Side', 'Finish 10 side quests', 'bronze'],
  ['Helping Hand', 'Finish every side quest', 'silver'],
  ['Curious', 'Try every game mode', 'bronze'],
  ['Once More', 'Start a second run or New Game+', 'silver'],
  ['Photographer', 'Take a screenshot you are proud of', 'bronze'],
];
const POOLS: Record<GenreKey, Tpl[]> = {
  adventure: [
    ['Explorer', 'Reveal the whole map', 'silver'], ['Treasure Hunter', 'Open 25 chests', 'bronze'],
    ['Challenger', 'Defeat the first boss', 'bronze'], ['Unstoppable', 'Defeat every boss', 'gold'],
    ['Fully Equipped', 'Unlock every ability or tool', 'silver'], ['Puzzle Master', 'Clear every dungeon or shrine', 'gold'],
    ['Not a Scratch', 'Defeat a boss without taking damage', 'silver'], ['Geared Up', 'Fully upgrade your equipment', 'bronze'],
  ],
  rpg: [
    ['Rising', 'Reach level 10', 'bronze'], ['Veteran', 'Reach level 50', 'silver'], ['Legend', 'Reach the max level', 'gold'],
    ['Companions', 'Recruit every party member', 'silver'], ['Smith', 'Craft a legendary weapon', 'silver'],
    ['Wealthy', 'Hold 100,000 gold', 'bronze'], ['Bestiary', 'Defeat every enemy type once', 'gold'], ['The Choice', 'Make a hard decision', 'bronze'],
  ],
  platformer: [
    ['Spring Step', 'Clear the first world', 'bronze'], ['Globetrotter', 'Visit every world', 'silver'],
    ['Star Catcher', 'Collect 100 main collectibles', 'silver'], ['Bagged It All', 'Collect every main collectible', 'gold'],
    ['Coin Shower', 'Collect 1,000 coins', 'bronze'], ['Secret Passage', 'Find a secret level', 'silver'],
    ['Flawless', 'Clear a level without getting hit', 'bronze'], ['Bonus World', 'Clear the bonus world', 'gold'],
  ],
  shooter: [
    ['Sharpshooter', 'Land 100 headshots', 'silver'], ['Arsenal', 'Use every weapon', 'bronze'],
    ['Hardened', 'Finish the campaign on hard', 'gold'], ['First Win', 'Win an online match', 'bronze'],
    ['On a Roll', 'Get a 10 streak', 'silver'], ['Kitted Out', 'Fully upgrade a weapon', 'bronze'],
    ['Team Player', 'Finish 25 matches', 'silver'],
  ],
  racing: [
    ['Lights Out', 'Win your first race', 'bronze'], ['Cup Collector', 'Win a cup', 'silver'],
    ['Champion', 'Win every cup', 'gold'], ['Lead Foot', 'Drive a perfect lap', 'bronze'],
    ['Garage', 'Unlock 25 vehicles', 'silver'], ['Photo Finish', 'Win by less than 0.1 seconds', 'bronze'],
    ['Top Class', 'Win in the fastest class', 'gold'],
  ],
  sports: [
    ['Kick-off', 'Play your first match', 'bronze'], ['Season Winner', 'Win a season', 'gold'],
    ['Unbeaten', 'Win 10 games in a row', 'silver'], ['Dream Team', 'Build your dream team', 'bronze'],
    ['Blowout', 'Win by 5 points or goals', 'bronze'], ['Cup Hero', 'Win a tournament', 'silver'],
    ['Hall of Fame', 'Reach the top league', 'gold'],
  ],
  fighting: [
    ['First Blood', 'Win your first fight', 'bronze'], ['Combo Artist', 'Land a 20 hit combo', 'silver'],
    ['Arcade Hero', 'Finish arcade mode', 'silver'], ['Versatile', 'Win with 10 different fighters', 'silver'],
    ['Perfect', 'Win a round without taking damage', 'bronze'], ['Full Roster', 'Unlock every fighter', 'gold'],
  ],
  strategy: [
    ['First Victory', 'Win your first match', 'bronze'], ['Commander', 'Finish the campaign', 'gold'],
    ['Builder', 'Build every building once', 'silver'], ['Blitz', 'Win in under 30 minutes', 'silver'],
    ['Diplomat', 'Win without fighting', 'gold'], ['Economic Miracle', 'Build up large reserves', 'bronze'],
  ],
  puzzle: [
    ['Aha!', 'Solve the first puzzle', 'bronze'], ['Brain Teaser', 'Solve 50 puzzles', 'silver'],
    ['No Hints', 'Finish a chapter without hints', 'silver'], ['Genius', 'Solve every puzzle', 'gold'],
    ['Quick Thinker', 'Solve a puzzle in record time', 'bronze'], ['Perfectionist', 'Get the best rating everywhere', 'gold'],
  ],
  horror: [
    ['Brave', 'Survive the first night', 'bronze'], ['Survivor', 'Finish the game without dying', 'gold'],
    ['Thrifty', 'End a chapter with full ammo', 'bronze'], ['Archivist', 'Find every document', 'silver'],
    ['Fearless', 'Play on the highest difficulty', 'gold'], ['Hide and Seek', 'Escape 10 chases', 'silver'],
  ],
  sandbox: [
    ['Foundation', 'Build your first home', 'bronze'], ['Architect', 'Build a large structure', 'silver'],
    ['Deep Digger', 'Reach the deepest layer', 'silver'], ['Self-sufficient', 'Build a working farm', 'bronze'],
    ['Conqueror', 'Defeat the final boss', 'gold'], ['Inventor', 'Build an automatic machine', 'silver'],
  ],
  party: [
    ['Sociable', 'Play with friends', 'bronze'], ['Party King', 'Win 10 games', 'silver'],
    ['All-rounder', 'Play every minigame', 'silver'], ['Lucky', 'Win at the last second', 'bronze'],
    ['Champion', 'Win 50 games', 'gold'],
  ],
  sim: [
    ['Moved In', 'Furnish your home', 'bronze'], ['Neighbourhood', 'Befriend 10 residents', 'silver'],
    ['Gardener', 'Harvest 100 plants', 'bronze'], ['Collector', 'Complete a collection', 'silver'],
    ['Dreamy', 'Reach the best rating', 'gold'], ['One Year', 'Live through a whole in-game year', 'silver'],
  ],
  other: [],
};

export function generate(title: string, genre: GenreKey = 'other', size: 'short' | 'normal' | 'long' = 'normal'): Trophy[] {
  const rnd = seeded((title || '') + genre);
  const shuffle = <T,>(arr: T[]) => arr.map(v => [rnd(), v] as const).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const n = { short: 7, normal: 12, long: 18 }[size] || 12;
  const pool = shuffle(POOLS[genre] || []);
  const extra = shuffle(EXTRA);
  const picked = [...BASE];
  picked.push(...pool.slice(0, Math.min(pool.length, Math.round((n - 2) * 0.65))));
  let i = 0;
  while (picked.length < n && i < extra.length) picked.push(extra[i++]);
  const rank = { gold: 0, silver: 1, bronze: 2 };
  const list: Trophy[] = picked
    .map(([name, desc, tier]) => ({ id: uid(), name, desc: desc.replace('{t}', title), tier, done: false }))
    .sort((a, b) => rank[b.tier as keyof typeof rank] - rank[a.tier as keyof typeof rank]);
  list.unshift({ id: uid(), name: `Master of ${title}`, desc: 'Earn every other trophy', tier: 'platinum', done: false });
  return list;
}

/* ---------- Import: read a pasted list (PSNProfiles, Exophase, Steam, own format) ---------- */

const TIER_WORD = /^(platinum|platin|gold|silver|silber|bronze)(\s*(trophy|trophäe|trophae))?$/i;
const PCT = /^(?:[a-zäöü ]+\s)?(\d{1,3}(?:[.,]\d+)?)\s*%/i;
const RARITY = /^(ultra rare|very rare|rare|uncommon|common|ultra selten|sehr selten|selten|ungewöhnlich|gewöhnlich|häufig)$/i;
const NOISE = /^([\d\s.,#/:+-]+|hidden( trophy| achievement)?|versteckt(e trophäe)?|secret|geheim|dlc|base game|hauptspiel)$/i;
const EARNED = /^(unlocked|earned|freigeschaltet|erhalten|errungen)\b.*\d/i;
const DATE = /(\b(jan|feb|mar|mär|apr|may|mai|jun|jul|aug|sep|oct|okt|nov|dec|dez)[a-z]*\.?\b.*\b(19|20)\d{2}\b)|(\b\d{1,2}\.\d{1,2}\.(19|20)?\d{2}\b)/i;

function wordToTier(w: string): Tier {
  w = w.toLowerCase();
  if (w.startsWith('plat')) return 'platinum';
  if (w.startsWith('gold')) return 'gold';
  if (w.startsWith('sil')) return 'silver';
  return 'bronze';
}

type Parsed = { name: string; desc: string; tier: Tier | null; rarity: number | null; done: boolean };

export function parse(text: string): Trophy[] {
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimRe = /\t|\s\|\s|\s;\s|;/;
  const delimited = lines.filter(l => delimRe.test(l)).length >= lines.length * 0.6;
  const out: Parsed[] = [];

  if (delimited) {
    lines.forEach(l => {
      const cells = l.split(/\t|\s*\|\s*|\s*;\s*/).map(c => c.trim()).filter(Boolean);
      let tier: Tier | null = null, rarity: number | null = null;
      const words: string[] = [];
      cells.forEach(c => {
        if (TIER_WORD.test(c)) tier = wordToTier(c);
        else if (PCT.test(c)) rarity = parseFloat(c.match(PCT)![1].replace(',', '.'));
        else if (!RARITY.test(c) && !NOISE.test(c)) words.push(c);
      });
      if (words.length) out.push({ name: words[0], desc: words.slice(1).join(' – '), tier, rarity, done: false });
    });
  } else {
    let cur: Parsed | null = null, pendingTier: Tier | null = null;
    for (const line of lines) {
      if (TIER_WORD.test(line)) { const t = wordToTier(line); if (cur && !cur.tier) cur.tier = t; else pendingTier = t; continue; }
      const pm = line.match(PCT);
      if (pm && line.length < 40) { if (cur) cur.rarity = parseFloat(pm[1].replace(',', '.')); continue; }
      if (RARITY.test(line) || NOISE.test(line)) continue;
      if ((EARNED.test(line) && line.length < 50) || (DATE.test(line) && line.length < 40)) { if (cur) cur.done = true; continue; }
      if (!cur || cur.desc) { cur = { name: line, desc: '', tier: pendingTier, rarity: null, done: false }; pendingTier = null; out.push(cur); }
      else cur.desc = line;
    }
  }

  let hasPlat = out.some(t => t.tier === 'platinum');
  out.forEach(t => {
    if (t.tier) return;
    const all = /(all|alle|every|sämtliche)\b.*(troph|erfolg|achievement)/i.test(t.desc) || /platin/i.test(t.name);
    if (all && !hasPlat) { t.tier = 'platinum'; hasPlat = true; return; }
    t.tier = t.rarity == null ? 'bronze' : t.rarity <= 5 ? 'gold' : t.rarity <= 20 ? 'silver' : 'bronze';
  });
  return out.map(t => ({ id: uid(), ...t, tier: t.tier as Tier }));
}
