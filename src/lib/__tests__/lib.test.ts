import { describe, expect, it } from 'vitest';
import { mix } from '../color';
import { CATEGORIES, SLOTS_PER_CATEGORY, freeSlot, seedWords } from '../data';
import { tones, DAY, NIGHT } from '../theme';
import { formatDuration, genitive, lowerTr, upperFirstTr, voiceLabel } from '../turkish';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('turkish', () => {
  it('lowercases and capitalises with Turkish rules', () => {
    expect(lowerTr('İstiyorum')).toBe('istiyorum');
    expect(lowerTr('Işık')).toBe('ışık');
    expect(upperFirstTr('istiyorum')).toBe('İstiyorum');
    expect(upperFirstTr('ışık')).toBe('Işık');
  });

  it('builds genitives with vowel harmony', () => {
    expect(genitive('Anne')).toBe('Annenin');
    expect(genitive('Hala')).toBe('Halanın');
    expect(genitive('Baba')).toBe('Babanın');
    expect(genitive('Dayı')).toBe('Dayının');
    expect(genitive('Doktor')).toBe('Doktorun');
    expect(genitive('Dilan', true)).toBe("Dilan'ın");
    expect(genitive('Ömür', true)).toBe("Ömür'ün");
    expect(voiceLabel('Dilan', true)).toBe("Dilan'ın sesi");
  });

  it('formats durations', () => {
    expect(formatDuration(2.2)).toBe('0:02');
    expect(formatDuration(65)).toBe('1:05');
  });
});

/** Within ±1 per channel of the design's hex (rounding differences). */
function near(actual: string, expected: string) {
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = ch(actual);
  ch(expected).forEach((v, i) => expect(Math.abs(a[i] - v), `${actual} vs ${expected}`).toBeLessThanOrEqual(1));
}

describe('colour tints match the design', () => {
  it('day tints', () => {
    const t = tones('#00B4C4', DAY); // Günlük
    near(t.pill!, '#CCF0F3');
    near(t.pillInset!, '#9EE2E9');
    near(t.navActive!, '#B2E8ED');
    near(t.navActiveInset!, '#85DBE3');
    expect(tones('#7B61FF', DAY).navIcon).toBe('#E2DCFF'); // Temel
  });

  it('night tints', () => {
    const t = tones('#2BC866', NIGHT); // Eşyalar
    near(t.pill!, '#1E6352');
    expect(tones('#7B61FF', NIGHT).navRing).toBe('#4F4FAE');
  });

  it('mix endpoints', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#000000');
  });
});

describe('seed board', () => {
  const words = seedWords('zeki');

  it('has unique ids and unique places per category', () => {
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    for (const cat of [...CATEGORIES.map((c) => c.id), 'core']) {
      const slots = words.filter((w) => w.category === cat).map((w) => w.slot);
      expect(new Set(slots).size).toBe(slots.length);
      expect(Math.max(-1, ...slots)).toBeLessThan(SLOTS_PER_CATEGORY);
    }
  });

  it('every bundled picture exists', () => {
    for (const w of words) {
      if (w.picture.kind === 'builtin') expect(existsSync(resolve('public', w.picture.src)), w.picture.src).toBe(true);
    }
    for (const c of CATEGORIES) expect(existsSync(resolve('public', c.icon)), c.icon).toBe(true);
  });

  it('keeps names capitalised in the sentence and lowercases the rest', () => {
    expect(words.find((w) => w.label === 'Su')?.say).toBe('su');
    expect(words.find((w) => w.label === 'Dilan')?.say).toBe('Dilan');
    expect(words.find((w) => w.label === 'Eve')?.say).toBe('eve');
  });

  it('finds the first free place, or -1 when full', () => {
    expect(freeSlot(words, 'esyalar')).toBe(-1);
    expect(freeSlot(words, 'duygu')).toBe(1);
  });
});
