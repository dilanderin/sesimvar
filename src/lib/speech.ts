import type { Word } from './data';
import { blobUrl } from './store';
import { clipUrl } from './voice';

/** Speech: a family recording plays first when a word has one; then the
 *  prerecorded voice (Ahmet) when the word has a clip; otherwise the device's
 *  Turkish voice reads it. */

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
let audio: HTMLAudioElement | null = null;
let unlocked = false;
let token = 0;
let rate = 0.95;
let clipRate = 1;
let pack: string | null = null;

const RATES = { slow: 0.75, normal: 0.95, fast: 1.15 } as const;
const CLIP_RATES = { slow: 0.8, normal: 1, fast: 1.2 } as const;

/** Set how fast the voice reads (from Ayarlar). */
export function setSpeechRate(r: keyof typeof RATES) {
  rate = RATES[r] ?? 0.95;
  clipRate = CLIP_RATES[r] ?? 1;
}

/** Choose the prerecorded voice, or null for the device voice only. */
export function setVoicePack(p: string | null) {
  pack = p;
}

/** True when this text will be read by the prerecorded voice. */
export function hasClip(text: string): boolean {
  return clipUrl(pack, text) !== null;
}

// ---- Prerecorded clips play through Web Audio from memory: no loading or
// decoding at the moment of the tap, so the word starts at once.
type AudioCtx = AudioContext;
let ctx: AudioCtx | null = null;
let source: AudioBufferSourceNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function audioContext(): AudioCtx | null {
  if (ctx) return ctx;
  const C = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    ctx = null;
  }
  return ctx;
}

function loadBuffer(url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    const c = audioContext();
    p = c
      ? fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((data) => new Promise<AudioBuffer>((resolve, reject) => c.decodeAudioData(data, resolve, reject)))
          .catch(() => {
            buffers.delete(url);
            return null;
          })
      : Promise.resolve(null);
    buffers.set(url, p);
  }
  return p;
}

/** Load the clips for these words into memory ahead of time (the visible board). */
export function preloadClips(voicePack: string | null, texts: string[]) {
  for (const t of texts) {
    const url = clipUrl(voicePack, t);
    if (url) void loadBuffer(url);
  }
}

/** Play a prerecorded clip. False if it could not be played (the caller falls back). */
async function playClip(url: string, my: number): Promise<boolean> {
  // Web Audio cannot slow a voice down without changing its pitch, so other
  // speeds use the audio element, which keeps the pitch.
  const c = clipRate === 1 ? audioContext() : null;
  if (!c) return playUrl(url, my);
  const buf = await loadBuffer(url);
  if (my !== token) return false;
  if (!buf) return playUrl(url, my);
  if (c.state !== 'running') void c.resume().catch(() => undefined);
  return new Promise((resolve) => {
    const node = c.createBufferSource();
    node.buffer = buf;
    node.connect(c.destination);
    source = node;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (source === node) source = null;
      resolve(ok);
    };
    node.onended = () => finish(my === token);
    // Safety net if the context stays suspended.
    setTimeout(() => finish(my === token), buf.duration * 1000 + 800);
    node.start();
  });
}

function sharedAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
  }
  return audio;
}

/** iOS only lets audio and speech start from a touch. Call this on the first
 *  pointerdown so later (delayed) playback is allowed. */
export function unlockAudio() {
  // Every touch: make sure Web Audio is running (iOS suspends it in the background).
  const c = audioContext();
  if (c && c.state !== 'running') void c.resume().catch(() => undefined);
  if (unlocked) return;
  unlocked = true;
  try {
    // Play through the silent switch like the device voice and recordings do (Safari 17+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    if (c) {
      const b = c.createBuffer(1, 1, 22050);
      const n = c.createBufferSource();
      n.buffer = b;
      n.connect(c.destination);
      n.start();
    }
    if (synth) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    }
    const a = sharedAudio();
    a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    void a.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function turkishVoices(): SpeechSynthesisVoice[] {
  if (!synth) return [];
  return synth.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('tr'));
}

export function onVoicesChanged(cb: () => void): () => void {
  if (!synth) return () => undefined;
  synth.addEventListener('voiceschanged', cb);
  return () => synth.removeEventListener('voiceschanged', cb);
}

export function pickVoice(voiceURI: string | null): SpeechSynthesisVoice | null {
  const voices = turkishVoices();
  return (
    (voiceURI && voices.find((v) => v.voiceURI === voiceURI)) ||
    voices.find((v) => /yelda/i.test(v.name)) ||
    voices.find((v) => v.localService) ||
    voices[0] ||
    null
  );
}

export function stopSpeaking() {
  token++;
  synth?.cancel();
  if (source) {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    source = null;
  }
  if (audio) {
    audio.pause();
    audio.onended = null;
  }
}

function speakText(text: string, voiceURI: string | null, my: number): Promise<void> {
  return new Promise((resolve) => {
    if (!synth || my !== token) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(voiceURI);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'tr-TR';
    u.rate = rate;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    // Safety net: some browsers never fire onend.
    setTimeout(finish, 600 + (text.length * 160) / rate);
    synth.speak(u);
  });
}

async function playRecording(key: string, my: number): Promise<boolean> {
  const url = await blobUrl(key);
  if (!url || my !== token) return false;
  return playUrl(url, my, 1);
}

function playUrl(url: string, my: number, speed = clipRate): Promise<boolean> {
  if (my !== token) return Promise.resolve(false);
  const a = sharedAudio();
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      a.onended = null;
      resolve(ok);
    };
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.src = url;
    a.playbackRate = speed;
    (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    a.play().catch(() => finish(false));
  });
}

/** Say one word. Resolves when it has finished. */
export async function sayWord(word: Pick<Word, 'say' | 'recording'>, voiceURI: string | null): Promise<void> {
  stopSpeaking();
  const my = token;
  if (word.recording && (await playRecording(word.recording.key, my))) return;
  const clip = clipUrl(pack, word.say);
  if (clip && (await playClip(clip, my))) return;
  await speakText(word.say, voiceURI, my);
}

/** Read a sentence word by word, calling `onWord` as each one starts. */
export async function saySentence(
  words: Pick<Word, 'say' | 'recording'>[],
  voiceURI: string | null,
  onWord: (index: number) => void,
): Promise<boolean> {
  stopSpeaking();
  const my = token;
  for (let i = 0; i < words.length; i++) {
    if (my !== token) return false;
    onWord(i);
    const w = words[i];
    if (w.recording && (await playRecording(w.recording.key, my))) continue;
    const clip = clipUrl(pack, w.say);
    if (clip && (await playClip(clip, my))) continue;
    await speakText(w.say, voiceURI, my);
  }
  return my === token;
}

/** Preview a voice in Ayarlar. */
export function previewVoice(voiceURI: string | null, parrotName: string) {
  stopSpeaking();
  const clip = clipUrl(pack, 'Merhaba. Birlikte konuşalım.');
  if (clip) void playClip(clip, token);
  else void speakText(`Merhaba, ben ${parrotName}. Birlikte konuşalım.`, voiceURI, token);
}
