import { useEffect, useState } from 'react';

export type ParrotPose = 'idle' | 'look' | 'hop' | 'talk' | 'celebrate' | 'cheeky';

interface Props {
  pose: ParrotPose;
  name: string;
  motion: boolean;
  width?: number;
  height?: number;
}

const INK = '#2B3147';

const CONFETTI: [number, number, string, number][] = [
  [-6, 8, '#7B61FF', 0], [8, -14, '#FF9600', 47], [104, -10, '#00B4C4', 94], [124, 14, '#FF4B6E', 141],
  [-12, 50, '#F2B100', 8], [130, 54, '#1C9BF6', 55], [20, -24, '#2BC866', 102], [96, -26, '#C05BF0', 149],
  [60, -34, '#A9713F', 16],
];

/** Pırpır, the parrot. Drawn once, posed by a handful of numbers: body lift,
 *  tilt, wing angle, eyes and beak. */
export function Parrot({ pose, name, motion, width = 128, height = 140 }: Props) {
  const [blink, setBlink] = useState(false);
  const [beakOpen, setBeakOpen] = useState(false);

  // Idle blinking, now and then.
  useEffect(() => {
    if (!motion) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2600 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, [motion]);

  // While talking the beak opens and closes 5 times a second.
  useEffect(() => {
    if (pose !== 'talk' || !motion) {
      setBeakOpen(pose === 'talk');
      return;
    }
    const id = setInterval(() => setBeakOpen((o) => !o), 100);
    return () => clearInterval(id);
  }, [pose, motion]);

  const P = {
    idle: { lift: 0, tilt: 0, wing: 0, shadow: 30, pupil: [2, 1] },
    look: { lift: 0, tilt: -7, wing: 0, shadow: 30, pupil: [6, 4] },
    hop: { lift: -14, tilt: 0, wing: 58, shadow: 23, pupil: [2, 0] },
    talk: { lift: 0, tilt: 3, wing: 0, shadow: 30, pupil: [2, 1] },
    celebrate: { lift: -24, tilt: 0, wing: 125, shadow: 18, pupil: [2, 1] },
    cheeky: { lift: 0, tilt: -5, wing: 0, shadow: 30, pupil: [2, 1] },
  }[pose];

  const lifted = P.lift !== 0;
  const happyEyes = pose === 'celebrate';
  const wink = pose === 'cheeky';
  const openBeak = pose === 'celebrate' || (pose === 'talk' && beakOpen);
  const smile = pose === 'hop' || pose === 'cheeky';
  const [px, py] = P.pupil;
  const eyeClosed = blink && !happyEyes;

  const eye = (cx: number, dir: 1 | -1, winkThis = false) => {
    if (winkThis) return <path d={`M${cx - 11} 56 Q${cx} 41 ${cx + 11} 56`} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />;
    if (happyEyes) return <path d={`M${cx - 11} 56 Q${cx} 41 ${cx + 11} 56`} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />;
    if (eyeClosed) return <path d={`M${cx - 11} 52 Q${cx} 60 ${cx + 11} 52`} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />;
    const ox = pose === 'look' ? (dir === 1 ? px : 2) : px * dir;
    return (
      <g>
        <circle cx={cx} cy="52" r="14" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
        <circle cx={cx + ox} cy={52 + py} r="7.5" fill={INK} />
        <circle cx={cx + ox + 2.5} cy={52 + py - 3.5} r="2.6" fill="#FFFFFF" />
      </g>
    );
  };

  return (
    <svg
      viewBox="-16 -38 152 166"
      width={width}
      height={height}
      role="img"
      aria-label={`Papağan ${name}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <ellipse
        cx="60"
        cy="121"
        rx={P.shadow}
        ry="5"
        fill={INK}
        opacity="0.16"
        style={{ transition: motion ? 'rx 160ms ease-out' : undefined }}
      />
      {pose === 'hop' && (
        <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" opacity="0.4">
          <path d="M40 112 l-4 7" />
          <path d="M60 114 v8" />
          <path d="M80 112 l4 7" />
        </g>
      )}
      <g
        style={{
          transform: `translate(0px, ${P.lift}px) rotate(${P.tilt}deg)`,
          transformOrigin: '60px 112px',
          transition: motion ? 'transform 180ms cubic-bezier(.3,1.6,.5,1)' : undefined,
        }}
      >
        <g className={motion && pose === 'idle' ? 'kb-breathe' : undefined}>
          <g style={{ transform: `rotate(${P.wing}deg)`, transformOrigin: '30px 62px', transition: motion ? 'transform 160ms ease-out' : undefined }}>
            <path d="M24 58c-13 6-17 27-8 40c9-3 16-14 16-28z" fill="#1C9BF6" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M15 80c5 3 11 2 15-2" stroke="#FFC83D" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          </g>
          <g style={{ transform: `rotate(${-P.wing}deg)`, transformOrigin: '90px 62px', transition: motion ? 'transform 160ms ease-out' : undefined }}>
            <path d="M96 58c13 6 17 27 8 40c-9-3-16-14-16-28z" fill="#1C9BF6" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M105 80c-5 3-11 2-15-2" stroke="#FFC83D" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          </g>
          <path
            d={lifted ? 'M47 110v5m-6 0h12M73 110v5m-6 0h12' : 'M47 110v8m-6 0h12M73 110v8m-6 0h12'}
            stroke="#F29A00"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 24c-7-9-3-18 4-22c0 6 3 9 6 12c1-7 7-11 13-10c-3 5-3 10-2 15c4-4 10-4 14-1c-6 2-10 7-13 12z"
            fill="#E5482E"
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="60" cy="68" rx="41" ry="44" fill="#FF6B4A" stroke={INK} strokeWidth="3" />
          <ellipse cx="60" cy="90" rx="26" ry="20" fill="#FFE4BF" />
          <ellipse cx="28" cy="71" rx="6.5" ry="4.5" fill="#FF9AA8" />
          <ellipse cx="92" cy="71" rx="6.5" ry="4.5" fill="#FF9AA8" />
          {eye(43, 1)}
          {eye(77, -1, wink)}
          {wink && <path d="M30 34 q6 -5 14 -3" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />}
          {openBeak ? (
            <>
              <path d="M49 70 Q60 100 71 70 Z" fill="#7A1F12" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M51 84 Q60 99 69 84 Q60 90 51 84 Z" fill="#FF8FA0" />
            </>
          ) : (
            <path d="M51 70q9 14 18 0z" fill="#E8900A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          )}
          <path d="M47 64q13-12 26 0q-2 11-13 14q-11-3-13-14z" fill="#FFC83D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M55 62q5-3 10 0" stroke="#E08A00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {smile && !openBeak && <path d="M50 77 q10 6 20 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
        </g>
      </g>
      {pose === 'talk' && (
        <g fill="none" stroke="#7B61FF" strokeWidth="4" strokeLinecap="round">
          <path d="M100 64 q7 7 0 14" />
          <path d="M109 57 q13 14 0 28" />
        </g>
      )}
      {pose === 'celebrate' &&
        CONFETTI.map(([x, y, c, r], i) => (
          <rect key={i} x={x} y={y} width="10" height="6" rx="2" fill={c} transform={`rotate(${r} ${x + 5} ${y + 3})`} />
        ))}
      {pose === 'cheeky' && (
        <path d="M108 14 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#F2B100" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** The big leaf the parrot sits on. */
export function ParrotLeaf({ fill, vein }: { fill: string; vein: string }) {
  return (
    <svg
      viewBox="0 0 200 100"
      width="196"
      height="98"
      aria-hidden="true"
      style={{ position: 'absolute', left: -10, top: 0, transform: 'rotate(-4deg)', pointerEvents: 'none', overflow: 'visible' }}
    >
      <path d="M4 50 C 50 -8, 150 -8, 196 50 C 150 108, 50 108, 4 50 Z" fill={fill} />
      <path
        d="M14 50 L 186 50 M60 50 L 84 24 M100 50 L 124 22 M140 50 L 160 30 M60 50 L 84 76 M100 50 L 124 78 M140 50 L 160 70"
        stroke={vein}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
