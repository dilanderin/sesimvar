/** The anonymous usage report the app sends (see src/lib/usage.ts) and the
 *  server checks (functions/api/usage.ts). Counts only: never words, sentences,
 *  names or recordings. */

export type DeviceKind = 'ipad' | 'iphone' | 'mac' | 'android' | 'other';

export interface UsageDay {
  /** Local date, YYYY-MM-DD. */
  day: string;
  taps: number;
  sentences: number;
  sends: number;
}

export interface UsageReport {
  /** A random number made on the device; it says nothing about who uses it. */
  device: string;
  kind: DeviceKind;
  /** Added to the Home Screen (runs as an app). */
  installed: boolean;
  version: string;
  days: UsageDay[];
}

const KINDS: DeviceKind[] = ['ipad', 'iphone', 'mac', 'android', 'other'];
const MAX_DAYS = 120;
const MAX_COUNT = 1_000_000;

const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_COUNT ? (v as number) : null);

/** Check a report from the internet: returns it cleaned, or null if anything is off. */
export function parseUsageReport(input: unknown, now = new Date()): UsageReport | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  if (typeof r.device !== 'string' || !/^[a-z0-9-]{16,40}$/.test(r.device)) return null;
  const kind = KINDS.includes(r.kind as DeviceKind) ? (r.kind as DeviceKind) : 'other';
  const version = typeof r.version === 'string' ? r.version.slice(0, 20) : '';
  if (!Array.isArray(r.days) || r.days.length === 0 || r.days.length > MAX_DAYS) return null;
  const latest = new Date(now.getTime() + 36 * 3600e3).toISOString().slice(0, 10); // time zones
  const earliest = new Date(now.getTime() - 400 * 86400e3).toISOString().slice(0, 10);
  const days: UsageDay[] = [];
  for (const d of r.days) {
    if (!d || typeof d !== 'object') return null;
    const x = d as Record<string, unknown>;
    const day = typeof x.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.day) ? x.day : null;
    const taps = count(x.taps);
    const sentences = count(x.sentences);
    const sends = count(x.sends);
    if (!day || day > latest || day < earliest || taps === null || sentences === null || sends === null) return null;
    days.push({ day, taps, sentences, sends });
  }
  return { device: r.device, kind, installed: r.installed === true, version, days };
}
