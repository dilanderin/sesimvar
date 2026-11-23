import type { DeviceKind, UsageDay, UsageReport } from './usage-report';

/** Anonymous usage counts (Ayarlar → Yedek → Kullanım sayısını paylaş).
 *  Counted on the device, also offline; sent when there is internet.
 *  Only numbers: never the words, sentences, names or recordings. */

const DEVICE_KEY = 'sesimvar:device';
const DAYS_KEY = 'sesimvar:usage';
const ENDPOINT = 'api/usage';
const KEEP_DAYS = 120;

declare const __APP_VERSION__: string;
const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

let enabled = false;

type Days = Record<string, Omit<UsageDay, 'day'>>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full: counting is not worth an error */
  }
}

/** Local date as YYYY-MM-DD. */
export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function deviceId(): string {
  let id = read<string | null>(DEVICE_KEY, null);
  if (!id || !/^[a-z0-9-]{16,40}$/.test(id)) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 8)).join('-');
    write(DEVICE_KEY, id);
  }
  return id;
}

function deviceKind(): DeviceKind {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ipad';
  if (/iPhone|iPod/.test(ua)) return 'iphone';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'mac';
  return 'other';
}

function installed(): boolean {
  return (
    matchMedia('(display-mode: fullscreen)').matches ||
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function bump(field: keyof Omit<UsageDay, 'day'> | null) {
  if (!enabled) return;
  const days = read<Days>(DAYS_KEY, {});
  const d = (days[today()] ??= { taps: 0, sentences: 0, sends: 0 });
  if (field) d[field] += 1;
  write(DAYS_KEY, days);
}

/** A word was tapped. */
export const countTap = () => bump('taps');
/** A sentence was read (Oku, or again from Son cümleler). */
export const countSentence = () => bump('sentences');
/** A sentence was sent (Gönder). */
export const countSend = () => bump('sends');

let sending = false;

/** Send what has been counted. Quietly does nothing offline or on error. */
export async function flushUsage(): Promise<void> {
  if (!enabled || sending || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const days = read<Days>(DAYS_KEY, {});
  const list = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-KEEP_DAYS)
    .map(([day, c]) => ({ day, ...c }));
  if (!list.length) return;
  const report: UsageReport = { device: deviceId(), kind: deviceKind(), installed: installed(), version: VERSION, days: list };
  sending = true;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    });
    if (res.ok) {
      // Sent: keep only today, which is still being counted (the server keeps the highest count).
      const now = read<Days>(DAYS_KEY, {});
      const t = today();
      write(DAYS_KEY, now[t] ? { [t]: now[t] } : {});
    }
  } catch {
    /* offline or blocked: try again later */
  } finally {
    sending = false;
  }
}

let started = false;

/** Turn counting on or off (Ayarlar). Off also forgets what was not sent yet. */
export function setUsageSharing(on: boolean) {
  enabled = on;
  if (!on) {
    try {
      localStorage.removeItem(DAYS_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  bump(null); // the app was opened today
  if (started || typeof window === 'undefined') return;
  started = true;
  void flushUsage();
  window.addEventListener('online', () => void flushUsage());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushUsage();
    else bump(null);
  });
  setInterval(() => void flushUsage(), 15 * 60_000);
}
