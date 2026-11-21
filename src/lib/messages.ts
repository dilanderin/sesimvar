import type { Word } from './data';
import { upperFirstTr } from './turkish';

/** The sentence as the message text: "İstiyorum su". */
export function sentenceText(words: Pick<Word, 'say'>[]): string {
  const text = words.map((w) => w.say).join(' ').trim();
  return upperFirstTr(text);
}

/** Phone numbers lose spaces, dashes and brackets; iMessage e-mail addresses stay as typed. */
export function normalizeAddress(address: string): string {
  const a = address.trim();
  if (a.includes('@')) return a;
  return a.replace(/[\s\-().]/g, '');
}

export function isValidAddress(address: string): boolean {
  const a = normalizeAddress(address);
  if (a.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a);
  return /^\+?\d{6,15}$/.test(a);
}

/** A link that opens Messages with the recipient and text filled in. Apple
 *  devices expect "&body=", others "?body=". */
export function smsUrl(address: string, body: string, apple = isAppleDevice()): string {
  return `sms:${normalizeAddress(address)}${apple ? '&' : '?'}body=${encodeURIComponent(body)}`;
}

function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return true;
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

declare global {
  interface Window {
    /** Tests can set this to see the Messages link instead of opening it. */
    __sesimvarOpenUrl?: (url: string) => void;
  }
}

/** Open Messages. Must be called inside a tap, or iOS blocks it. */
export function openMessages(url: string) {
  if (typeof window.__sesimvarOpenUrl === 'function') {
    window.__sesimvarOpenUrl(url);
    return;
  }
  window.location.href = url;
}
