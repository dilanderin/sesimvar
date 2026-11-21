import { useCallback, useEffect, useRef, useState } from 'react';

export interface Take {
  blob: Blob;
  seconds: number;
  url: string;
}

/** Record a short voice clip with the microphone. */
export function useRecorder(maxSeconds = 8) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (rec.current && rec.current.state !== 'inactive') rec.current.stop();
    if (tick.current) clearInterval(tick.current);
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Bu cihaz ses kaydını desteklemiyor.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const seconds = (Date.now() - started.current) / 1000;
        setTake((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { blob, seconds, url: URL.createObjectURL(blob) };
        });
      };
      rec.current = mr;
      started.current = Date.now();
      setElapsed(0);
      mr.start();
      setRecording(true);
      tick.current = setInterval(() => {
        const s = (Date.now() - started.current) / 1000;
        setElapsed(s);
        if (s >= maxSeconds) stop();
      }, 100);
    } catch {
      setError('Mikrofona izin verilmedi.');
    }
  }, [maxSeconds, stop]);

  const clear = useCallback(() => {
    setTake((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { recording, elapsed, take, error, start, stop, clear };
}
