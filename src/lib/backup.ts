import type { Word } from './data';
import { getBlob, getState, initialState, refreshSeedPictures, replaceState, saveBlob, type AppState } from './store';

/** A backup is one JSON file: the board and settings, plus every recording,
 *  photo and downloaded pictogram as base64. */
export interface BackupFile {
  app: 'sesimvar';
  format: 1;
  createdAt: string;
  state: AppState;
  blobs: Record<string, { type: string; data: string }>;
}

/** The stored files a board refers to. */
export function blobKeys(words: Word[]): string[] {
  const keys = new Set<string>();
  for (const w of words) {
    if (w.picture.kind === 'stored') keys.add(w.picture.key);
    if (w.recording) keys.add(w.recording.key);
  }
  return [...keys];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function createBackup(): Promise<{ file: File; missing: number }> {
  const state = getState();
  const blobs: BackupFile['blobs'] = {};
  let missing = 0;
  for (const key of blobKeys(state.words)) {
    const blob = await getBlob(key);
    if (!blob) {
      missing++;
      continue;
    }
    blobs[key] = { type: blob.type || 'application/octet-stream', data: await blobToBase64(blob) };
  }
  const backup: BackupFile = { app: 'sesimvar', format: 1, createdAt: new Date().toISOString(), state, blobs };
  const day = backup.createdAt.slice(0, 10);
  const file = new File([JSON.stringify(backup)], `sesimvar-yedek-${day}.json`, { type: 'application/json' });
  return { file, missing };
}

/** Hand the backup file to the user: the share sheet on iPad (Save to Files,
 *  iCloud Drive, AirDrop…), otherwise a normal download. */
export async function saveBackupFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sesim Var yedeği' });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // Fall through to a download if sharing fails for another reason.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export class BackupError extends Error {}

/** Check a parsed file really is a Sesim Var backup. */
export function parseBackup(raw: unknown): BackupFile {
  const b = raw as Partial<BackupFile> | null;
  if (!b || b.app !== 'sesimvar' || b.format !== 1 || !b.state || !Array.isArray(b.state.words) || typeof b.blobs !== 'object') {
    throw new BackupError('Bu dosya bir Sesim Var yedeği değil.');
  }
  return b as BackupFile;
}

export function summarize(b: BackupFile) {
  const words = b.state.words.filter((w) => w.category !== 'core').length;
  const recordings = b.state.words.filter((w) => w.recording && b.blobs[w.recording.key]).length;
  return { words, recordings, createdAt: b.createdAt };
}

export async function restoreBackup(b: BackupFile) {
  for (const [key, { type, data }] of Object.entries(b.blobs)) {
    await saveBlob(key, base64ToBlob(data, type));
  }
  const fresh = initialState();
  replaceState({ ...fresh, ...b.state, words: refreshSeedPictures(b.state.words), version: 1, settings: { ...fresh.settings, ...b.state.settings } });
}
