import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
const { seedWords } = await import('../data');
const { addMissingSeeds } = await import('../store');

describe('new built-in words reach saved boards', () => {
  const all = seedWords();
  const oldBoard = all.filter((w) => !['ekran-youtube', 'ekran-netflix', 'yerler-koy', 'yerler-elazig'].includes(w.id));

  it('adds words that are missing, in their own free place', () => {
    const next = addMissingSeeds(oldBoard);
    for (const id of ['ekran-youtube', 'ekran-netflix', 'yerler-koy', 'yerler-elazig']) {
      const w = next.find((x) => x.id === id);
      expect(w, id).toBeTruthy();
      expect(w!.slot).toBe(all.find((x) => x.id === id)!.slot);
    }
    expect(next.slice(0, oldBoard.length)).toEqual(oldBoard); // nothing existing changes
  });

  it('never takes a place the family already used', () => {
    const koySlot = all.find((w) => w.id === 'yerler-koy')!.slot;
    const family = { ...oldBoard[0], id: 'w-family-1', label: 'Okul', say: 'okul', category: 'yerler' as const, slot: koySlot };
    const next = addMissingSeeds([...oldBoard, family]);
    expect(next.find((w) => w.id === 'yerler-koy')).toBeUndefined();
    expect(next.find((w) => w.id === 'w-family-1')!.slot).toBe(koySlot);
    expect(next.find((w) => w.id === 'yerler-elazig')).toBeTruthy();
  });

  it('changes nothing for an up-to-date board', () => {
    expect(addMissingSeeds(all)).toBe(all);
  });
});
