import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// store.ts touches localStorage/matchMedia at import time; give it stubs.
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
const { LIBRARY, searchLibrary, seedWords } = await import('../data');
const { refreshSeedPictures } = await import('../store');

describe('redrawn pictures', () => {
  it('library pictures exist and are not already on the board', () => {
    const labels = new Set(seedWords().map((w) => w.label));
    for (const item of LIBRARY) {
      expect(existsSync(resolve('public', item.src)), item.src).toBe(true);
      expect(labels.has(item.label), item.label).toBe(false);
    }
  });

  it('finds library words by prefix, Turkish-aware', () => {
    expect(searchLibrary('bug').map((i) => i.label)).toEqual(['Bugün']);
    expect(searchLibrary('AÇ').map((i) => i.label)).toContain('Aç');
    expect(searchLibrary('')).toEqual([]);
  });

  it('moves saved boards to the new bundled pictures but keeps family photos', () => {
    const seeds = seedWords();
    const su = seeds.find((w) => w.id === 'gunluk-su')!;
    expect(su.picture).toEqual({ kind: 'builtin', src: 'pictos/v2/su.png' });
    const old = [
      { ...su, picture: { kind: 'builtin' as const, src: 'pictos/su.png' } },
      { ...seeds.find((w) => w.id === 'gunluk-cay')!, picture: { kind: 'stored' as const, key: 'photo-1', source: 'photo' as const } },
      { ...su, id: 'w-custom', picture: { kind: 'builtin' as const, src: 'pictos/v2/bugun.png' } },
    ];
    const [a, b, c] = refreshSeedPictures(old);
    expect(a.picture).toEqual({ kind: 'builtin', src: 'pictos/v2/su.png' });
    expect(b.picture.kind).toBe('stored');
    expect(c.picture).toEqual(old[2].picture);
  });
});
