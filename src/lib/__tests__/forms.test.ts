import { describe, expect, it } from 'vitest';
import { seedWords } from '../data';
import { FORM_WORD_IDS, formBefore, wordForms } from '../forms';
import type { Word } from '../data';

describe('word forms', () => {
  const seeds = [...seedWords('genel'), ...seedWords('zeki')];
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

  it('has "o yaptı" (third person past) for every action', () => {
    expect(wordForms({ id: 'eylem-gel' })).toContain('geldi');
    expect(wordForms({ id: 'eylem-yap' })).toContain('yaptı');
    expect(wordForms({ id: 'eylem-git' })).toContain('gitti');
    expect(wordForms({ id: 'ekran-izle' })).toContain('izledi');
  });

  it('gives forms to action words added from Hazır resimler, found by the word', () => {
    expect(wordForms({ id: 'w-ic-abc123', say: 'iç' })).toContain('içti');
    expect(wordForms({ id: 'w-ye-abc123', say: 'Ye' })).toContain('yedi');
    expect(wordForms({ id: 'w-zurafa-1', say: 'zürafa' })).toEqual([]);
  });

  it('says "Kolum acıyor" for Kol + acıyor, and leaves everything else alone', () => {
    const kol = { id: 'vucut-kol', say: 'kol' } as Word;
    expect(formBefore({ word: kol }, { say: 'acıyor' })).toBe('kolum');
    expect(formBefore({ word: { id: 'vucut-karin', say: 'karın' } as Word }, { say: 'acıyor' })).toBe('karnım');
    expect(formBefore({ word: { id: 'w-goz-1', say: 'göz' } as Word }, { say: 'kaşınıyor' })).toBe('gözüm');
    expect(formBefore({ word: kol }, { say: 'ver' })).toBeUndefined(); // not about pain
    expect(formBefore({ word: kol, form: 'kollarım' }, { say: 'acıyor' })).toBeUndefined(); // chosen form stays
    expect(formBefore({ word: { id: 'gunluk-su', say: 'su' } as Word }, { say: 'acıyor' })).toBeUndefined();
  });
});
