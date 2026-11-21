import { describe, expect, it } from 'vitest';
import { seedWords } from '../data';
import { FORM_WORD_IDS, wordForms } from '../forms';

describe('word forms', () => {
  const seeds = seedWords();
  const ids = new Set(seeds.map((w) => w.id));

  it('only refers to words that exist on the board', () => {
    for (const id of FORM_WORD_IDS) expect(ids.has(id), id).toBe(true);
  });

  it('has distinct forms that differ from the base word', () => {
    for (const w of seeds) {
      const forms = wordForms(w);
      expect(new Set(forms).size, w.id).toBe(forms.length);
      expect(forms.includes(w.say), w.id).toBe(false);
    }
  });

  it('gets the tricky Turkish ones right', () => {
    const byId = (id: string) => wordForms({ id });
    expect(byId('gunluk-su')).toContain('suyu');
    expect(byId('vucut-karin')[0]).toBe('karnım');
    expect(byId('vucut-kol')[0]).toBe('kolum');
    expect(byId('eylem-gel')).toContain('gelme');
    expect(byId('gunluk-acıktım')).toEqual([]); // words without forms: hold does nothing
  });
});
