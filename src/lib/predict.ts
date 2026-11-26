import type { Word } from './data';
import { lowerTr } from './turkish';

/** Next-word suggestions: after a word is tapped, a few likely next words
 *  appear in the sentence balloon, so a word can be said without searching
 *  the board. They come from what this person said before (learned on the
 *  device, never sent anywhere) and, until there is enough of that, from
 *  simple Turkish sentence patterns. Only words on the board are suggested. */

/** Learned counts: previous word id (or START) → next word id → times said. */
export type NextCounts = Record<string, Record<string, number>>;
export const START = '^';

const MAX_PER_WORD = 16;
const MAX_WORDS = 400;

/** Count each word pair of a sentence that was read or sent (ids may carry "::form"). */
export function learnSentence(counts: NextCounts | undefined, keys: string[]): NextCounts {
  const ids = keys.map((k) => k.split('::')[0]);
  if (!ids.length) return counts ?? {};
  const next: NextCounts = { ...(counts ?? {}) };
  [START, ...ids].forEach((prev, i) => {
    const cur = ids[i];
    if (!cur || cur === prev) return;
    const row = { ...(next[prev] ?? {}) };
    row[cur] = (row[cur] ?? 0) + 1;
    // Keep each word's list short: the most-used next words.
    next[prev] = Object.fromEntries(Object.entries(row).sort((a, b) => b[1] - a[1]).slice(0, MAX_PER_WORD));
  });
  const keysNow = Object.keys(next);
  if (keysNow.length > MAX_WORDS) {
    const total = (k: string) => Object.values(next[k]).reduce((a, b) => a + b, 0);
    for (const k of keysNow.sort((a, b) => total(a) - total(b)).slice(0, keysNow.length - MAX_WORDS)) if (k !== START) delete next[k];
  }
  return next;
}

/** What usually follows a word of this kind in a short Turkish sentence (by the spoken word). */
const AFTER_CATEGORY: Record<string, string[]> = {
  kisiler: ['gel', 'nerede', 'ara', 'git', 'bak'],
  gunluk: ['istiyorum', 'istemiyorum', 'ver', 'getir', 'bitti', 'daha'],
  esyalar: ['istiyorum', 'ver', 'getir', 'çalışmıyor', 'bozuk', 'nerede', 'aç', 'kapat'],
  ekran: ['istiyorum', 'izle', 'oyna', 'açar mısın', 'bitti', 'çalışmıyor'],
  yerler: ['gidelim', 'git', 'istiyorum', 'gel'],
  vucut: ['acıyor', 'kaşınıyor', 'kızardı', 'kırıldı'],
  duygu: ['ben', 'çok', 'şimdi'],
  eylem: ['şimdi', 'sonra', 'tamam', 'lütfen'],
};
/** Words whose own meaning calls for a different follow-up. */
const AFTER_WORD: Record<string, string[]> = {
  ben: ['acıktım', 'susadım', 'yoruldum', 'üşüdüm', 'istiyorum', 'bilmiyorum'],
  acıyor: ['ilaç', 'doktor', 'çok'],
  acıktım: ['yemek', 'ekmek', 'meyve'],
  susadım: ['su', 'çay', 'süt'],
  yoruldum: ['uyku', 'otur', 'eve', 'oda'],
  üşüdüm: ['battaniye', 'sıcak', 'çay'],
  hasta: ['doktor', 'ilaç', 'eve'],
  ışık: ['aç', 'kapat'],
  oda: ['gidelim', 'git', 'istiyorum'],
  daha: ['su', 'yemek', 'oyna'],
  istiyorum: ['şimdi', 'lütfen', 'daha'],
  istemiyorum: ['bitti', 'sonra'],
};

/** Up to `max` words likely to come next, best first. Never the same word
 *  again, never a hidden word, never a word that is not on the board. */
export function suggestNext(prev: Word | null, words: Word[], counts: NextCounts | undefined, max = 3): Word[] {
  const onBoard = words.filter((w) => !w.hidden);
  const byId = new Map(onBoard.map((w) => [w.id, w]));
  const bySay = new Map<string, Word>();
  // The always-visible row first, then the boards in order: the first word with a spoken form wins.
  for (const w of [...onBoard].sort((a, b) => (a.category === 'core' ? -1 : 0) - (b.category === 'core' ? -1 : 0) || a.slot - b.slot)) {
    const k = lowerTr(w.say.trim());
    if (!bySay.has(k)) bySay.set(k, w);
  }
  const score = new Map<string, number>();
  const add = (w: Word | undefined, s: number) => {
    if (!w || (prev && w.id === prev.id)) return;
    score.set(w.id, (score.get(w.id) ?? 0) + s);
  };
  // What this person said before weighs most.
  const learned = counts?.[prev ? prev.id : START] ?? {};
  for (const [id, n] of Object.entries(learned)) add(byId.get(id), 10 + 4 * n);
  if (prev) {
    const rules = AFTER_WORD[lowerTr(prev.say.trim())] ?? (prev.category === 'core' ? [] : (AFTER_CATEGORY[prev.category] ?? []));
    rules.forEach((say, i) => add(bySay.get(say), 5 - i * 0.5));
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => byId.get(id)!);
}
