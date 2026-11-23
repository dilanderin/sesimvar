import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});
const { canUndoReset, getState, resetToOriginal, setState, undoReset } = await import('../store');

describe('reset to original', () => {
  beforeEach(() => store.delete('sesimvar:before-reset'));

  it('puts back the built-in board and settings, and can be undone', () => {
    setState((s) => ({
      ...s,
      words: s.words.map((w) => (w.id === 'temel-oldu' ? { ...w, label: 'Oldu!', hidden: true } : w)),
      settings: { ...s.settings, parrotName: 'Maviş', sendTo: { name: 'Abla', address: '+905551112233' } },
    }));
    resetToOriginal();
    const fresh = getState();
    expect(fresh.words.find((w) => w.id === 'temel-oldu')).toMatchObject({ label: 'Oldu', hidden: false });
    expect(fresh.settings.parrotName).toBe('Pırpır');
    expect(canUndoReset()).toBe(true);

    expect(undoReset()).toBe(true);
    const back = getState();
    expect(back.words.find((w) => w.id === 'temel-oldu')).toMatchObject({ label: 'Oldu!', hidden: true });
    expect(back.settings.sendTo.address).toBe('+905551112233');
    expect(canUndoReset()).toBe(false);
  });

  it('has nothing to undo before a reset', () => {
    expect(undoReset()).toBe(false);
  });
});
