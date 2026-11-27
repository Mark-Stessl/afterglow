/**
 * When to look for new episodes and chapters, and how to tell the user.
 * Checks run shortly after start (after sync had a chance to pull), and again when the app comes back
 * to the front; each check itself waits 3 hours between runs. "Check now" forces both.
 */
import { checkChapters, checkEpisodes, type News } from './data/watch';
import { href } from './router';
import { toast } from './ui/kit';

function announce(news: News[]) {
  if (!news.length) return;
  if (news.length === 1) {
    const n = news[0];
    toast(n.item.title, n.text, { label: 'Open', run: () => { location.hash = href('item', n.item.id); } });
    return;
  }
  const titles = [...new Set(news.map(n => n.item.title))];
  toast(`${news.length} new things`, titles.slice(0, 3).join(', ') + (titles.length > 3 ? ' …' : ''));
}

async function runAll(force: boolean) {
  const [eps, chs] = await Promise.all([
    checkEpisodes({ force }).catch(() => ({ news: [], error: 'network' })),
    checkChapters({ force }).catch(() => ({ news: [], error: 'network' })),
  ]);
  announce([...eps.news, ...chs.news]);
  return { count: eps.news.length + chs.news.length, error: eps.error || chs.error };
}

/** Background checks. Call once at start. */
export function startNewsChecks() {
  setTimeout(() => { void runAll(false); }, 3000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runAll(false);
  });
}

/** The "Check now" button. */
export async function checkNow() {
  const r = await runAll(true);
  if (r.count) return;
  if (r.error === 'key_required') toast('Chapters need sync', 'Connect this device with your key on the Data page to check manga');
  else if (r.error) toast('Not everything could be checked', 'Try again later');
  else toast('Nothing new', 'Everything is up to date');
}

/** Right after adding a series or anime: fill in aired episodes and the schedule. */
export function checkNewItem(id: string) {
  setTimeout(() => { void checkEpisodes({ force: true, ids: [id] }); }, 400);
}
