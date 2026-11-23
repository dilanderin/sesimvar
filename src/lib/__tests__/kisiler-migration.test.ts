import { describe, expect, it, vi } from 'vitest';
import type { Word } from '../data';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
const { seedWords } = await import('../data');
const { upgradeState, initialState } = await import('../store');

/** The Kişiler board as it was saved before 2026-11-22. */
function oldBoard(): Word[] {
  const now = seedWords('zeki').filter((w) => !['kisiler-guler-teyze', 'kisiler-baris'].includes(w.id));
  return [
    ...now.map((w) => (w.id === 'kisiler-dayi' ? { ...w, hidden: true } : w)),
    { id: 'kisiler-teyze', label: 'Teyze', say: 'Teyze', category: 'kisiler', slot: 5, hidden: true, picture: { kind: 'builtin', src: 'pictos/teyze.svg' } },
  ];
}
const saved = (words: Word[], migrations?: string[]) => ({ ...initialState('zeki'), words, migrations });
const kisiler = (ws: Word[]) => ws.filter((w) => w.category === 'kisiler' && !w.hidden).map((w) => `${w.slot}:${w.label}`).sort();

describe('Kişiler on Zeki’s board: Barış, Güler Teyze, Dayı', () => {
  it('shows all three on a saved board without moving anything', () => {
    const before = oldBoard();
    const after = upgradeState(saved(before), 'zeki').words;
    expect(kisiler(after)).toEqual(['0:Anne', '1:Baba', '2:Amca', '3:Hala', '4:Dilan', '5:Güler Teyze', '6:Dayı', '8:Barış']);
    for (const w of before) expect(after.find((x) => x.id === w.id)!.slot).toBe(w.slot);
  });

  it('a new board has the same Kişiler', () => {
    expect(kisiler(initialState('zeki').words)).toEqual(['0:Anne', '1:Baba', '2:Amca', '3:Hala', '4:Dilan', '5:Güler Teyze', '6:Dayı', '8:Barış']);
  });

  it('runs once: a word the family hides again stays hidden', () => {
    const once = upgradeState(saved(oldBoard()), 'zeki');
    const hidden = once.words.map((w) => (w.label === 'Dayı' ? { ...w, hidden: true } : w));
    const twice = upgradeState({ ...once, words: hidden }, 'zeki');
    expect(twice.words.find((w) => w.label === 'Dayı')!.hidden).toBe(true);
  });

  it('keeps a Teyze the family changed, and adds Güler Teyze in a free place', () => {
    const board = oldBoard().map((w) => (w.id === 'kisiler-teyze' ? { ...w, label: 'Ayşe Teyze', say: 'Ayşe Teyze' } : w));
    const after = upgradeState(saved(board), 'zeki').words;
    expect(after.find((w) => w.id === 'kisiler-teyze')!.label).toBe('Ayşe Teyze');
    const guler = after.filter((w) => w.label === 'Güler Teyze');
    expect(guler).toHaveLength(1);
    expect(after.filter((w) => w.category === 'kisiler' && w.slot === guler[0].slot)).toHaveLength(1);
  });
});
