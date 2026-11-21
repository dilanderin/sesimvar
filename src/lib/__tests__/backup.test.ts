import { describe, expect, it } from 'vitest';
import { BackupError, blobKeys, parseBackup, summarize } from '../backup';
import { seedWords, type Word } from '../data';

const extra: Word = {
  id: 'w-lego-1',
  label: 'Lego',
  say: 'Lego',
  category: 'esyalar',
  slot: 11,
  hidden: false,
  picture: { kind: 'stored', key: 'photo-1', source: 'photo' },
  recording: { key: 'voice-1', by: 'Anne', proper: false, seconds: 1.4 },
};

describe('backup', () => {
  it('collects the stored files a board refers to', () => {
    const words = [...seedWords(), extra, { ...extra, id: 'w-2', recording: undefined, picture: { kind: 'text' } as const }];
    expect(blobKeys(words).sort()).toEqual(['photo-1', 'voice-1']);
  });

  it('rejects files that are not Sesim Var backups', () => {
    expect(() => parseBackup(null)).toThrow(BackupError);
    expect(() => parseBackup({ app: 'other' })).toThrow(BackupError);
    expect(() => parseBackup({ app: 'sesimvar', format: 2, state: { words: [] }, blobs: {} })).toThrow(BackupError);
  });

  it('summarises a valid backup', () => {
    const b = parseBackup({
      app: 'sesimvar',
      format: 1,
      createdAt: '2026-11-21T10:00:00.000Z',
      state: { version: 1, words: [...seedWords(), extra], settings: {} },
      blobs: { 'voice-1': { type: 'audio/mp4', data: 'AAAA' } },
    });
    const s = summarize(b);
    expect(s.recordings).toBe(1);
    expect(s.words).toBe(seedWords().filter((w) => w.category !== 'core').length + 1);
  });
});
