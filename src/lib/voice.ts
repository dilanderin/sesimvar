import { lowerTr } from './turkish';
import clips from './voice-clips.json';

/** Prerecorded voice: every built-in word, ready-made picture and word form
 *  is recorded once (scripts/make-voice.py) and shipped with the app, so it
 *  sounds the same on every device and works offline. Words the family types
 *  themselves fall back to the device voice (or their own recording). */

export interface VoicePack {
  id: string;
  /** Shown in Ayarlar. */
  name: string;
}

export const VOICE_PACKS: VoicePack[] = [{ id: 'ahmet', name: 'Ahmet (genç erkek sesi)' }];
export const DEFAULT_VOICE_PACK = 'ahmet';

/** The same text always maps to the same clip, whatever its letter case. */
export function clipKey(text: string): string {
  return lowerTr(text.trim().replace(/\s+/g, ' '));
}

/** File name for a clip: readable, plus a short hash so "Dilan'a" and "dilana" differ. */
export function clipFile(key: string): string {
  let h = 0x811c9dc5;
  for (const ch of key) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const readable = key
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${readable || 'x'}-${h.toString(36)}`;
}

const recorded: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(clips as Record<string, string[]>).map(([pack, keys]) => [pack, new Set(keys)]),
);

/** URL of the prerecorded clip for this text, or null when there is none. */
export function clipUrl(pack: string | null, text: string): string | null {
  if (!pack) return null;
  const key = clipKey(text);
  return recorded[pack]?.has(key) ? `voice/${pack}/${clipFile(key)}.mp3` : null;
}
