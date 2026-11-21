import { useEffect, useRef } from 'react';
import type { Word } from '../lib/data';
import { CATEGORIES } from '../lib/data';
import { WordPicture } from './WordPicture';

type Rect = { x: number; y: number; w: number; h: number };

const STAR = 'M10 0 C 10.8 6, 14 9.2, 20 10 C 14 10.8, 10.8 14, 10 20 C 9.2 14, 6 10.8, 0 10 C 6 9.2, 9.2 6, 10 0 Z';

/** Five sparkles in the category colour bursting from a tapped card. */
export function Sparkles({ rect, color }: { rect: Rect; color: string }) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const spots = [
    { a: -120, d: 0.62, s: 34 },
    { a: -60, d: 0.66, s: 44 },
    { a: -10, d: 0.6, s: 28 },
    { a: 160, d: 0.6, s: 28 },
    { a: -90, d: 0.78, s: 26 },
  ];
  return (
    <>
      {spots.map((p, i) => {
        const r = (p.a * Math.PI) / 180;
        const dist = Math.max(rect.w, 96) * p.d;
        return (
          <svg
            key={i}
            className="kb-sparkle"
            viewBox="0 0 20 20"
            width={p.s}
            height={p.s}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: cx - p.s / 2,
              top: cy - p.s / 2,
              ['--dx' as string]: `${Math.cos(r) * dist}px`,
              ['--dy' as string]: `${Math.sin(r) * dist}px`,
              animationDelay: `${i * 18}ms`,
              pointerEvents: 'none',
              zIndex: 40,
              overflow: 'visible',
            }}
          >
            <path d={STAR} fill={color} stroke="#2B3147" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        );
      })}
    </>
  );
}

/** The card's picture flying in an arc into the sentence balloon (300–600 ms). */
export function Flyer({
  word,
  from,
  to,
  circleColor,
  onDone,
}: {
  word: Word;
  from: Rect;
  to: Rect;
  circleColor: string;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = to.w / from.w;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const peak = Math.min(dy, 0) - 90;
    const anim = el.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx * 0.45}px, ${peak}px) scale(${(1 + s) / 2})`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
      ],
      { duration: 300, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' },
    );
    anim.onfinish = () => done.current();
    return () => anim.cancel();
  }, [from, to]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: from.w,
        height: from.h,
        borderRadius: '50%',
        background: circleColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transformOrigin: '0 0',
        zIndex: 50,
        pointerEvents: 'none',
        boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
      }}
    >
      <WordPicture picture={word.picture} label={word.label} size={from.w * 0.8} />
    </div>
  );
}

/** 40 pieces of confetti in the nine category colours, falling with gravity. */
export function Confetti({ width, height }: { width: number; height: number }) {
  const pieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 160,
      fall: height * (0.55 + Math.random() * 0.45),
      rot: (Math.random() - 0.5) * 720,
      delay: Math.random() * 180,
      dur: 900 + Math.random() * 250,
      color: CATEGORIES[i % CATEGORIES.length].color,
      round: i % 4 === 0,
    })),
  ).current;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="kb-confetti"
          style={{
            position: 'absolute',
            left: p.x,
            top: -24,
            width: p.round ? 12 : 16,
            height: p.round ? 12 : 8,
            borderRadius: p.round ? '50%' : 3,
            background: p.color,
            ['--drift' as string]: `${p.drift}px`,
            ['--fall' as string]: `${p.fall}px`,
            ['--rot' as string]: `${p.rot}deg`,
            animationDelay: `${150 + p.delay}ms`,
            animationDuration: `${p.dur}ms`,
          }}
        />
      ))}
    </div>
  );
}
