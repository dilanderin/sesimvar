import { describe, expect, it } from 'vitest';
import { seedWords } from '../data';
import { START, learnSentence, suggestNext } from '../predict';

const words = seedWords('genel');
const w = (id: string) => words.find((x) => x.id === id)!;
const says = (ws: { say: string }[]) => ws.map((x) => x.say);

describe('next-word suggestions', () => {
  it('suggests what usually follows, from simple patterns, before anything is learned', () => {
    expect(says(suggestNext(w('gunluk-su'), words, undefined))).toEqual(['istiyorum', 'istemiyorum', 'ver']);
    expect(says(suggestNext(w('vucut-kol'), words, undefined))).toEqual(['acıyor', 'kaşınıyor', 'kızardı']);
    expect(says(suggestNext(w('kisiler-anne'), words, undefined))).toEqual(['gel', 'nerede', 'ara']);
    expect(says(suggestNext(w('temel-ben'), words, undefined))).toEqual(['acıktım', 'susadım', 'yoruldum']);
  });

  it('learns from sentences said on this device, and that comes first', () => {
    let counts = learnSentence(undefined, ['gunluk-su', 'core-daha']);
    counts = learnSentence(counts, ['gunluk-su', 'core-daha']);
    counts = learnSentence(counts, ['gunluk-su::suyu', 'eylem-ver']);
    const s = says(suggestNext(w('gunluk-su'), words, counts));
    expect(s[0]).toBe('daha');
    expect(s[1]).toBe('ver');
    expect(counts[START]['gunluk-su']).toBe(3);
  });

  it('suggests sentence starters only once something was learned', () => {
    expect(suggestNext(null, words, undefined)).toEqual([]);
    const counts = learnSentence(undefined, ['kisiler-anne', 'eylem-gel']);
    expect(says(suggestNext(null, words, counts))).toEqual(['Anne']);
  });

  it('never suggests a hidden word, the same word again, or a word not on the board', () => {
    const hidden = words.map((x) => (x.say === 'istiyorum' ? { ...x, hidden: true } : x));
    expect(says(suggestNext(w('gunluk-su'), hidden, undefined))).not.toContain('istiyorum');
    const counts = learnSentence(undefined, ['gunluk-su', 'gunluk-su', 'w-gone-1']);
    const s = suggestNext(w('gunluk-su'), words, counts);
    expect(s.map((x) => x.id)).not.toContain('gunluk-su');
    expect(s.map((x) => x.id)).not.toContain('w-gone-1');
  });

  it('keeps the learned list small', () => {
    let counts = undefined as ReturnType<typeof learnSentence> | undefined;
    for (let i = 0; i < 40; i++) counts = learnSentence(counts, ['gunluk-su', `w-x-${i}`]);
    expect(Object.keys(counts!['gunluk-su']).length).toBeLessThanOrEqual(16);
  });
});
