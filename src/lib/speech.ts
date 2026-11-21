import type { Word } from './data';
import { blobUrl } from './store';

/** Speech: a family recording plays first when a word has one; otherwise the
 *  device's Turkish voice reads it. */

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
let audio: HTMLAudioElement | null = null;
let unlocked = false;
let token = 0;

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
  if (unlocked) return;
  unlocked = true;
  try {
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
    u.rate = 0.95;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    // Safety net: some browsers never fire onend.
    setTimeout(finish, 600 + text.length * 160);
    synth.speak(u);
  });
}

async function playRecording(key: string, my: number): Promise<boolean> {
  const url = await blobUrl(key);
  if (!url || my !== token) return false;
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
    a.play().catch(() => finish(false));
  });
}

/** Say one word. Resolves when it has finished. */
export async function sayWord(word: Pick<Word, 'say' | 'recording'>, voiceURI: string | null): Promise<void> {
  stopSpeaking();
  const my = token;
  if (word.recording && (await playRecording(word.recording.key, my))) return;
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
    await speakText(w.say, voiceURI, my);
  }
  return my === token;
}

/** Preview a voice in Ayarlar. */
export function previewVoice(voiceURI: string | null, parrotName: string) {
  stopSpeaking();
  void speakText(`Merhaba, ben ${parrotName}. Birlikte konuşalım.`, voiceURI, token);
}
