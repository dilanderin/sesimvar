import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIBRARY, defaultSay, seedWords } from '../data';
import { FORM_WORD_IDS, SAY_FORM_TEXTS, wordForms } from '../forms';
import { DEFAULT_VOICE_PACK, clipFile, clipKey, clipUrl } from '../voice';

describe('prerecorded voice', () => {
  const texts = [
    ...seedWords().map((w) => w.say),
    ...LIBRARY.map((i) => defaultSay(i.label, i.category)),
    ...FORM_WORD_IDS.flatMap((id) => wordForms({ id })),
    ...SAY_FORM_TEXTS,
  ];

  it('has a clip for every built-in word, ready-made picture and form', () => {
    // If this fails after adding words: run scripts/make-voice.py (see its header).
    const missing = texts.filter((t) => !clipUrl(DEFAULT_VOICE_PACK, t));
    expect(missing).toEqual([]);
  });

  it('every listed clip exists as a file', () => {
    for (const t of texts) expect(existsSync(`public/${clipUrl(DEFAULT_VOICE_PACK, t)}`), t).toBe(true);
  });

  it('ignores letter case and spacing, but keeps different words apart', () => {
    expect(clipKey('  Güler   Teyze ')).toBe('güler teyze');
    expect(clipUrl(DEFAULT_VOICE_PACK, 'SU')).toBe(clipUrl(DEFAULT_VOICE_PACK, 'su'));
    expect(clipFile("dilan'a")).not.toBe(clipFile('dilana'));
  });

  it('has no clip for words the family typed, or with no voice chosen', () => {
    expect(clipUrl(DEFAULT_VOICE_PACK, 'zürafa')).toBeNull();
    expect(clipUrl(null, 'su')).toBeNull();
  });
});
