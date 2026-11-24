import { useSyncExternalStore } from 'react';
import { del, get, set } from 'idb-keyval';
import { freeSlot, seedWords, type Profile, type Word } from './data';
import { currentProfile, saveProfile } from './profile';
import { learnSentence, type NextCounts } from './predict';
import { DEFAULT_VOICE_PACK } from './voice';

export type CardSize = 'small' | 'medium' | 'large';
export type ThemeChoice = 'auto' | 'day' | 'night';

export interface Settings {
  size: CardSize;
  theme: ThemeChoice;
  motion: boolean;
  voiceURI: string | null;
  /** Prerecorded voice used for words that have a clip (null: device voice only). */
  voicePack: string | null;
  parrotName: string;
  /** Locked: settings open only with a 2-second press on the gear. */
  locked: boolean;
  /** The six word ids of the always-visible row, left to right. */
  core: string[];
  /** How fast the device voice reads. */
  speechRate: SpeechRate;
  /** Ignore another card tap within this many ms (0 = off), for unsteady hands. */
  tapGuardMs: TapGuard;
  /** Gönder opens Messages to this person (phone number or iMessage address). Empty: Gönder only speaks. */
  sendTo: { name: string; address: string };
  /** Hold a card to choose a word form (kolum, suya, geliyorum…). Off by default. */
  wordForms: boolean;
  /** A second page of 12 places per category, reached by scrolling down (on by default since
   *  2026-11-23, the owner's choice). The first page never changes. */
  secondPage: boolean;
  /** Send anonymous usage counts (no words or sentences). On by default; the owner asked for it. */
  shareUsage: boolean;
  /** Next-word suggestions in the sentence balloon. On by default (owner's request). */
  suggestions: boolean;
}

export type SpeechRate = 'slow' | 'normal' | 'fast';
export type TapGuard = 0 | 500 | 1000;

/** Most recent first; each sentence is a list of word ids. */
export const HISTORY_LIMIT = 12;

export interface AppState {
  version: 1;
  words: Word[];
  /** Recently read or sent sentences (word ids), newest first. */
  history: string[][];
  settings: Settings;
  /** One-time changes already applied to this board (see MIGRATIONS). */
  migrations?: string[];
  /** Which word usually follows which, learned from sentences said (see predict.ts). Stays on the device. */
  next?: NextCounts;
}

const STORAGE_KEY = 'sesimvar:v1';

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function initialState(profile: Profile = activeProfile): AppState {
  const words = seedWords(profile);
  return {
    version: 1,
    words,
    history: [],
    settings: {
      size: 'medium',
      theme: 'auto',
      motion: !prefersReducedMotion(),
      voiceURI: null,
      voicePack: DEFAULT_VOICE_PACK,
      parrotName: 'Pırpır',
      locked: true,
      core: words.filter((w) => w.category === 'core').map((w) => w.id),
      speechRate: 'normal',
      tapGuardMs: 0,
      sendTo: { name: '', address: '' },
      wordForms: false,
      secondPage: true,
      shareUsage: true,
      suggestions: true,
    },
    migrations: MIGRATIONS.filter((m) => appliesTo(m, profile)).map((m) => m.id),
  };
}

/** Built-in words follow the app's current bundled pictures (so a new picture
 *  set reaches boards saved earlier), but only while they still use a bundled
 *  picture: a photo or pictogram the family chose is kept. */
export function refreshSeedPictures(words: Word[], profile: Profile = activeProfile): Word[] {
  const seeds = new Map(seedWords(profile).map((w) => [w.id, w.picture]));
  return words.map((w) => {
    const seed = seeds.get(w.id);
    if (!seed || w.picture.kind !== 'builtin' || seed.kind !== 'builtin' || seed.src === w.picture.src) return w;
    return { ...w, picture: seed };
  });
}

/** Built-in words added in a later version appear on saved boards too, but
 *  only in a place that is still free: nothing the family arranged moves. */
export function addMissingSeeds(words: Word[], profile: Profile = activeProfile): Word[] {
  const ids = new Set(words.map((w) => w.id));
  const taken = new Set(words.map((w) => `${w.category}:${w.slot}`));
  const added: Word[] = [];
  for (const seed of seedWords(profile)) {
    if (ids.has(seed.id) || seed.category === 'core') continue;
    const key = `${seed.category}:${seed.slot}`;
    if (taken.has(key)) continue;
    taken.add(key);
    added.push(seed);
  }
  return added.length ? [...words, ...added] : words;
}

/** One-time changes the family asked for, applied once to boards saved
 *  earlier. Each one only adds or shows words; nothing moves or disappears.
 *  A board remembers which ran, so a word hidden again later stays hidden. */
interface Migration {
  id: string;
  /** Only for this board; otherwise for every board. */
  only?: Profile;
  run: (words: Word[]) => Word[];
  settings?: (s: Settings) => Settings;
}

const appliesTo = (m: Migration, p: Profile) => !m.only || m.only === p;

/** Family words that belong only on Zeki's board (with their built-in label). */
const FAMILY_WORDS: Record<string, string> = {
  'kisiler-dilan': 'Dilan',
  'kisiler-baris': 'Barış',
  'kisiler-guler-teyze': 'Güler Teyze',
  'yerler-elazig': 'Elazığ',
};

/** A built-in word the family never changed: no recording or photo, same name. */
const untouched = (w: Word, label: string) => w.label === label && !w.recording && w.picture.kind === 'builtin';

export const MIGRATIONS: Migration[] = [
  {
    // "Add Kişiler: Barış, Güler Teyze, Dayı" (2026-11-22).
    id: 'kisiler-baris-guler-dayi',
    only: 'zeki',
    run: (words) => {
      const seeds = seedWords('zeki');
      let next = [...words];
      const show = (label: string): boolean => {
        const i = next.findIndex((w) => w.category === 'kisiler' && w.label === label);
        if (i < 0) return false;
        if (next[i].hidden) next[i] = { ...next[i], hidden: false };
        return true;
      };
      const add = (id: string) => {
        const seed = seeds.find((w) => w.id === id)!;
        const taken = next.some((w) => w.category === 'kisiler' && w.slot === seed.slot);
        const slot = taken ? freeSlot(next, 'kisiler') : seed.slot;
        if (slot >= 0) next = [...next, { ...seed, slot }];
      };
      if (!show('Dayı')) add('kisiler-dayi');
      if (!show('Barış')) add('kisiler-baris');
      if (!show('Güler Teyze')) {
        // The built-in "Teyze" the family never changed becomes Güler Teyze in its own place.
        const i = next.findIndex((w) => w.id === 'kisiler-teyze' && untouched(w, 'Teyze'));
        if (i >= 0) next[i] = { ...next[i], label: 'Güler Teyze', say: 'Güler Teyze', hidden: false };
        else add('kisiler-guler-teyze');
      }
      return next;
    },
  },
  {
    // Others started using Sesim Var: the family's own names and places stay on
    // Zeki's board only (2026-11-23). Words the family changed are kept; Güler
    // Teyze goes back to the general "Teyze". Choosing Zeki's board brings them
    // back in the same places (next migration).
    id: 'genel-without-family-names',
    only: 'genel',
    run: (words) =>
      words.flatMap((w) => {
        const label = FAMILY_WORDS[w.id];
        if (label && untouched(w, label)) return [];
        if (w.id === 'kisiler-teyze' && untouched(w, 'Güler Teyze')) return [{ ...w, label: 'Teyze', say: 'Teyze' }];
        return [w];
      }),
  },
  {
    // Zeki's board has the family's people and places (2026-11-23).
    id: 'zeki-family-words',
    only: 'zeki',
    run: (words) => {
      const seeds = seedWords('zeki');
      let next = [...words];
      const i = next.findIndex((w) => w.id === 'kisiler-teyze' && untouched(w, 'Teyze'));
      if (i >= 0 && !next.some((w) => w.label === 'Güler Teyze')) next[i] = { ...next[i], label: 'Güler Teyze', say: 'Güler Teyze', hidden: false };
      for (const [id, label] of Object.entries(FAMILY_WORDS)) {
        const seed = seeds.find((w) => w.id === id)!;
        const j = next.findIndex((w) => w.category === seed.category && w.label === label);
        if (j >= 0) {
          if (next[j].hidden) next[j] = { ...next[j], hidden: false };
          continue;
        }
        const category = seed.category as Exclude<Word['category'], 'core'>;
        const taken = next.some((w) => w.category === category && w.slot === seed.slot);
        const slot = taken ? freeSlot(next, category) : seed.slot;
        if (slot >= 0) next = [...next, { ...seed, slot }];
      }
      return next;
    },
  },
  {
    // The owner asked for the second page to be on, as a scroll down (2026-11-23).
    id: 'second-page-on',
    run: (words) => words,
    settings: (s) => ({ ...s, secondPage: true }),
  },
];

/** Bring a saved or restored board up to date with this version of the app. */
export function upgradeState(saved: AppState, profile: Profile = activeProfile): AppState {
  const fresh = initialState(profile);
  const done = new Set(saved.migrations ?? []);
  let words = refreshSeedPictures(saved.words, profile);
  let settings: Settings = { ...fresh.settings, ...saved.settings };
  for (const m of MIGRATIONS) {
    if (!appliesTo(m, profile) || done.has(m.id)) continue;
    words = m.run(words);
    if (m.settings) settings = m.settings(settings);
    done.add(m.id);
  }
  words = addMissingSeeds(words, profile);
  return {
    ...fresh,
    ...saved,
    version: 1,
    words,
    settings,
    migrations: [...done],
  };
}

let activeProfile: Profile = currentProfile();

/** The board this device shows: "genel" or Zeki's. */
export function getProfile(): Profile {
  return activeProfile;
}

/** Switch this device to another board (Ayarlar → Aile kodu). Nothing the
 *  family changed is lost; built-in family words appear or go away. */
export function setProfile(p: Profile) {
  if (p === activeProfile) return;
  activeProfile = p;
  saveProfile(p);
  state = upgradeState(state, p);
  emit();
}

function load(): AppState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1 && Array.isArray(parsed.words)) {
        const loaded = upgradeState(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
        return loaded;
      }
    }
  } catch {
    /* fall through to a fresh board */
  }
  const fresh = initialState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    /* ignore */
  }
  return fresh;
}

let state: AppState = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable: keep working in memory */
  }
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  state = update(state);
  emit();
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function updateWord(id: string, patch: Partial<Word>) {
  setState((s) => ({ ...s, words: s.words.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
}

export function addWord(word: Word) {
  setState((s) => ({ ...s, words: [...s.words, word] }));
}

export function removeWord(id: string) {
  const word = state.words.find((w) => w.id === id);
  if (word?.picture.kind === 'stored') void deleteBlob(word.picture.key);
  if (word?.recording) void deleteBlob(word.recording.key);
  setState((s) => ({
    ...s,
    words: s.words.filter((w) => w.id !== id),
    settings: { ...s.settings, core: s.settings.core.map((c) => (c === id ? defaultCoreFor(s, c) : c)) },
  }));
}

function defaultCoreFor(s: AppState, removed: string): string {
  const fallback = s.words.find((w) => w.category === 'core' && !s.settings.core.includes(w.id) && w.id !== removed);
  return fallback?.id ?? removed;
}

/** Move a word to another place on its board (drag to reorder in Ayarlar). */
export function moveWord(id: string, toSlot: number) {
  setState((s) => {
    const word = s.words.find((w) => w.id === id);
    if (!word) return s;
    const occupant = s.words.find((w) => w.category === word.category && w.slot === toSlot && w.id !== id);
    return {
      ...s,
      words: s.words.map((w) => {
        if (w.id === id) return { ...w, slot: toSlot };
        if (occupant && w.id === occupant.id) return { ...w, slot: word.slot };
        return w;
      }),
    };
  });
}

// ---- Blobs (photos, ARASAAC pictograms, voice recordings) live in IndexedDB.

const blobUrls = new Map<string, string>();

export async function saveBlob(key: string, blob: Blob) {
  await set(`blob:${key}`, blob);
  const old = blobUrls.get(key);
  if (old) URL.revokeObjectURL(old);
  blobUrls.set(key, URL.createObjectURL(blob));
}

export async function blobUrl(key: string): Promise<string | null> {
  const cached = blobUrls.get(key);
  if (cached) return cached;
  const blob = await get<Blob>(`blob:${key}`);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  blobUrls.set(key, url);
  return url;
}

export async function deleteBlob(key: string) {
  await del(`blob:${key}`);
  const old = blobUrls.get(key);
  if (old) URL.revokeObjectURL(old);
  blobUrls.delete(key);
}

export function newBlobKey(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return get<Blob>(`blob:${key}`);
}

const BEFORE_RESET_KEY = 'sesimvar:before-reset';

/** Put the board back the way the app first started: built-in words, places
 *  and settings. The board as it was is kept, so it can be brought back with
 *  undoReset(); photos and recordings stay on the device for that. */
export function resetToOriginal() {
  try {
    localStorage.setItem(BEFORE_RESET_KEY, JSON.stringify(state));
  } catch {
    /* no room to keep a copy: still reset, the family confirmed it */
  }
  state = initialState();
  emit();
}

/** True while the board from before the last reset can be brought back. */
export function canUndoReset(): boolean {
  try {
    return !!localStorage.getItem(BEFORE_RESET_KEY);
  } catch {
    return false;
  }
}

/** Bring back the board from before the last reset. */
export function undoReset(): boolean {
  try {
    const raw = localStorage.getItem(BEFORE_RESET_KEY);
    if (!raw) return false;
    state = upgradeState(JSON.parse(raw) as AppState);
    localStorage.removeItem(BEFORE_RESET_KEY);
    emit();
    return true;
  } catch {
    return false;
  }
}

/** Replace the whole board (used when restoring a backup). */
export function replaceState(next: AppState) {
  state = next;
  emit();
}

/** Remember a sentence that was read or sent (skips an exact repeat of the latest). */
export function rememberSentence(ids: string[]) {
  if (!ids.length) return;
  setState((s) => {
    // Learn which word follows which, for next-word suggestions.
    const next = learnSentence(s.next, ids);
    const prev = s.history ?? [];
    if (prev[0] && prev[0].join('|') === ids.join('|')) return { ...s, next };
    const rest = prev.filter((h) => h.join('|') !== ids.join('|'));
    return { ...s, next, history: [ids, ...rest].slice(0, HISTORY_LIMIT) };
  });
}

export function clearHistory() {
  setState((s) => ({ ...s, history: [] }));
}
