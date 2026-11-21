import { describe, expect, it, vi, beforeEach } from 'vitest';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

describe('recent sentences and new settings', () => {
  beforeEach(() => vi.resetModules());

  it('remembers sentences newest first, skips repeats, keeps at most 12', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const store = await import('../store');
    store.rememberSentence(['a', 'b']);
    store.rememberSentence(['a', 'b']); // exact repeat of the latest: ignored
    store.rememberSentence(['c']);
    store.rememberSentence(['a', 'b']); // older repeat moves to the top
    expect(store.getState().history).toEqual([['a', 'b'], ['c']]);
    for (let i = 0; i < 20; i++) store.rememberSentence([`w${i}`]);
    expect(store.getState().history).toHaveLength(store.HISTORY_LIMIT);
    expect(store.getState().history[0]).toEqual(['w19']);
    store.clearHistory();
    expect(store.getState().history).toEqual([]);
  });

  it('loads a board saved before these features with safe defaults', async () => {
    const { seedWords } = await import('../data');
    const old = {
      version: 1,
      words: seedWords(),
      settings: { size: 'large', theme: 'night', motion: false, voiceURI: null, parrotName: 'Pırpır', locked: true, core: [] },
    };
    vi.stubGlobal('localStorage', memoryStorage({ 'sesimvar:v1': JSON.stringify(old) }));
    const store = await import('../store');
    const s = store.getState();
    expect(s.history).toEqual([]);
    expect(s.settings.speechRate).toBe('normal');
    expect(s.settings.tapGuardMs).toBe(0);
    expect(s.settings.size).toBe('large'); // the family's own choices are kept
    expect(s.settings.theme).toBe('night');
  });
});
