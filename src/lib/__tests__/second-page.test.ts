import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
const { MAX_SLOTS_PER_CATEGORY, SLOTS_PER_CATEGORY, freeSlot, seedWords } = await import('../data');
const { initialState, upgradeState } = await import('../store');

describe('second page', () => {
  const words = seedWords();

  it('a full category has no free place on one page, and place 12 with two pages', () => {
    expect(words.filter((w) => w.category === 'temel')).toHaveLength(12);
    expect(freeSlot(words, 'temel')).toBe(-1);
    expect(freeSlot(words, 'temel', MAX_SLOTS_PER_CATEGORY)).toBe(SLOTS_PER_CATEGORY);
  });

  it('a category with room still fills its first page first', () => {
    expect(freeSlot(words, 'yerler', MAX_SLOTS_PER_CATEGORY)).toBe(3);
  });

  it('is on for new boards, and turned on once for boards saved with it off', () => {
    expect(initialState().settings.secondPage).toBe(true);
    const old = initialState();
    const saved = { ...old, settings: { ...old.settings, secondPage: false }, migrations: ['kisiler-baris-guler-dayi'] };
    const up = upgradeState(saved);
    expect(up.settings.secondPage).toBe(true);
    // The family turns it off again: it stays off.
    expect(upgradeState({ ...up, settings: { ...up.settings, secondPage: false } }).settings.secondPage).toBe(false);
  });

  it('keeps second-page words when it is turned off (they are only not shown)', () => {
    const extra = { ...words[0], id: 'w-extra', label: 'Okul', category: 'temel' as const, slot: 12 };
    const s = upgradeState({ ...initialState(), words: [...words, extra] });
    expect(s.words.find((w) => w.id === 'w-extra')!.slot).toBe(12);
  });
});
