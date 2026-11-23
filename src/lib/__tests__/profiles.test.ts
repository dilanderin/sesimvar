import { describe, expect, it, vi } from 'vitest';
import type { Word } from '../data';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const { seedWords } = await import('../data');
const { initialState, upgradeState } = await import('../store');
const { profileForCode, profileFromPath } = await import('../profile');

const visible = (ws: Word[], cat: string) => ws.filter((w) => w.category === cat && !w.hidden).map((w) => `${w.slot}:${w.label}`).sort();
const FAMILY = ['Dilan', 'Barış', 'Güler Teyze', 'Elazığ'];

/** A board saved before 2026-11-23: it had the family's words for everyone. */
function savedBefore() {
  return { ...initialState('zeki'), migrations: ['kisiler-baris-guler-dayi', 'second-page-on'] };
}

describe('genel and Zeki boards', () => {
  it('a new general board has no family names', () => {
    const labels = seedWords('genel').map((w) => w.label);
    for (const f of FAMILY) expect(labels).not.toContain(f);
    expect(visible(initialState('genel').words, 'kisiler')).toEqual(['0:Anne', '1:Baba', '2:Amca', '3:Hala', '5:Teyze', '6:Dayı']);
  });

  it('Zeki’s board keeps them all in their places', () => {
    expect(visible(initialState('zeki').words, 'kisiler')).toEqual(['0:Anne', '1:Baba', '2:Amca', '3:Hala', '4:Dilan', '5:Güler Teyze', '6:Dayı', '8:Barış']);
    expect(visible(initialState('zeki').words, 'yerler')).toContain('2:Elazığ');
  });

  it('a board saved earlier loses the untouched family words on the general board, nothing else', () => {
    const before = savedBefore();
    const after = upgradeState(before, 'genel').words;
    for (const f of FAMILY) expect(after.some((w) => w.label === f)).toBe(false);
    expect(visible(after, 'kisiler')).toEqual(['0:Anne', '1:Baba', '2:Amca', '3:Hala', '5:Teyze', '6:Dayı']);
    // Every other word stays in its place.
    for (const w of before.words) {
      if (FAMILY.includes(w.label)) continue;
      expect(after.find((x) => x.id === w.id)?.slot, w.id).toBe(w.slot);
    }
  });

  it('keeps a family word the family changed (a recording or photo)', () => {
    const before = savedBefore();
    before.words = before.words.map((w) => (w.label === 'Dilan' ? { ...w, recording: { key: 'voice-1', by: 'Anne', proper: false, seconds: 1 } } : w));
    const after = upgradeState(before, 'genel').words;
    expect(after.find((w) => w.label === 'Dilan')?.recording?.key).toBe('voice-1');
  });

  it('switching that board to Zeki brings everything back in the same places', () => {
    const before = savedBefore();
    const genel = upgradeState(before, 'genel');
    const zeki = upgradeState(genel, 'zeki');
    expect(visible(zeki.words, 'kisiler')).toEqual(visible(before.words, 'kisiler'));
    expect(visible(zeki.words, 'yerler')).toEqual(visible(before.words, 'yerler'));
  });

  it('a new general board switched to Zeki gets the family words too', () => {
    const zeki = upgradeState(initialState('genel'), 'zeki');
    expect(visible(zeki.words, 'kisiler')).toEqual(['0:Anne', '1:Baba', '2:Amca', '3:Hala', '4:Dilan', '5:Güler Teyze', '6:Dayı', '8:Barış']);
  });

  it('Zeki’s board saved earlier does not change', () => {
    const before = savedBefore();
    const after = upgradeState(before, 'zeki');
    expect(visible(after.words, 'kisiler')).toEqual(visible(before.words, 'kisiler'));
  });

  it('opens Zeki’s board from the address or the family code', () => {
    expect(profileFromPath('/zeki')).toBe('zeki');
    expect(profileFromPath('/Zeki/')).toBe('zeki');
    expect(profileFromPath('/')).toBeNull();
    expect(profileFromPath('/baska')).toBeNull();
    expect(profileForCode(' ZEKİ ')).toBe('zeki'); // Turkish keyboard capitals
    expect(profileForCode(' Zeki ')).toBe('zeki');
  });
});
