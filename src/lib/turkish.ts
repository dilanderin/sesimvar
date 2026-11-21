/** Turkish text helpers. */

export function lowerTr(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

export function upperFirstTr(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

const BACK_VOWELS = 'aıou';
const VOWELS = 'aeıioöuü';

/** Genitive of a name following vowel harmony: Anne → Annenin, Hala → Halanın,
 *  Dilan → Dilan'ın (proper names take an apostrophe). */
export function genitive(name: string, proper = false): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const lower = lowerTr(trimmed);
  const lastVowel = [...lower].reverse().find((c) => VOWELS.includes(c)) ?? 'e';
  let suffixVowel: string;
  if (BACK_VOWELS.includes(lastVowel)) suffixVowel = lastVowel === 'a' || lastVowel === 'ı' ? 'ı' : 'u';
  else suffixVowel = lastVowel === 'e' || lastVowel === 'i' ? 'i' : 'ü';
  const endsWithVowel = VOWELS.includes(lower.charAt(lower.length - 1));
  const suffix = (endsWithVowel ? 'n' : '') + suffixVowel + 'n';
  return trimmed + (proper ? "'" : '') + suffix;
}

/** "Annenin sesi", "Dilan'ın sesi". */
export function voiceLabel(name: string, proper: boolean): string {
  return `${genitive(name, proper)} sesi`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
