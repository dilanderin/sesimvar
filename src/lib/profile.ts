import type { Profile } from './data';
import { lowerTr } from './turkish';

/** Which board this device shows (see Profile in data.ts). Opening
 *  sesimvar.d3asoft.com/zeki, or typing the family code in Ayarlar, chooses
 *  Zeki's board; the device remembers it, also offline. */

const KEY = 'sesimvar:profile';
const CODES: Record<string, Profile> = { zeki: 'zeki' };

/** The board a family code opens, or null for an unknown code. */
export function profileForCode(code: string): Profile | null {
  return CODES[lowerTr(code.trim())] ?? null;
}

/** The board named in the address (sesimvar.d3asoft.com/zeki), if any. */
export function profileFromPath(path: string): Profile | null {
  const m = /^\/([^/]+)\/?$/.exec(path);
  return m ? profileForCode(decodeURIComponent(m[1])) : null;
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
}

export function currentProfile(): Profile {
  if (typeof window === 'undefined') return 'genel';
  const fromPath = typeof location !== 'undefined' ? profileFromPath(location.pathname) : null;
  if (fromPath) {
    saveProfile(fromPath);
    return fromPath;
  }
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'zeki' ? 'zeki' : 'genel';
  } catch {
    return 'genel';
  }
}
