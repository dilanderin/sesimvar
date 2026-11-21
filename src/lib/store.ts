import { useSyncExternalStore } from 'react';
import { del, get, set } from 'idb-keyval';
import { seedWords, type Word } from './data';

export type CardSize = 'small' | 'medium' | 'large';
export type ThemeChoice = 'auto' | 'day' | 'night';

export interface Settings {
  size: CardSize;
  theme: ThemeChoice;
  motion: boolean;
  voiceURI: string | null;
  parrotName: string;
  /** Locked: settings open only with a 2-second press on the gear. */
  locked: boolean;
  /** The six word ids of the always-visible row, left to right. */
  core: string[];
}

export interface AppState {
  version: 1;
  words: Word[];
  settings: Settings;
}

const STORAGE_KEY = 'sesimvar:v1';

function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function initialState(): AppState {
  const words = seedWords();
  return {
    version: 1,
    words,
    settings: {
      size: 'medium',
      theme: 'auto',
      motion: !prefersReducedMotion(),
      voiceURI: null,
      parrotName: 'Pırpır',
      locked: true,
      core: words.filter((w) => w.category === 'core').map((w) => w.id),
    },
  };
}

/** Built-in words follow the app's current bundled pictures (so a new picture
 *  set reaches boards saved earlier), but only while they still use a bundled
 *  picture: a photo or pictogram the family chose is kept. */
export function refreshSeedPictures(words: Word[]): Word[] {
  const seeds = new Map(seedWords().map((w) => [w.id, w.picture]));
  return words.map((w) => {
    const seed = seeds.get(w.id);
    if (!seed || w.picture.kind !== 'builtin' || seed.kind !== 'builtin' || seed.src === w.picture.src) return w;
    return { ...w, picture: seed };
  });
}

function load(): AppState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1 && Array.isArray(parsed.words)) {
        const fresh = initialState();
        const loaded: AppState = { ...fresh, ...parsed, words: refreshSeedPictures(parsed.words), settings: { ...fresh.settings, ...parsed.settings } };
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

/** Replace the whole board (used when restoring a backup). */
export function replaceState(next: AppState) {
  state = next;
  emit();
}
