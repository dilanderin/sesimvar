import { mix, rgba } from './color';

export type Mode = 'day' | 'night';

export interface Theme {
  mode: Mode;
  bg: string;
  surface: string;
  surfaceInset: string;
  text: string;
  muted: string;
  /** Drop shadow tint for surfaces. */
  shadow: (a: number) => string;
  coreCircle: string;
  roundBtn: string;
  roundBtnInset: string;
  roundBtnIcon: string;
  gear: string;
  oku: string;
  okuInset: string;
  gonder: string;
  gonderInset: string;
  leaf: string;
  leafVein: string;
}

export const DAY: Theme = {
  mode: 'day',
  bg: '#FFE9DA',
  surface: '#FFFFFF',
  surfaceInset: '#FFF0E6',
  text: '#3A2420',
  muted: '#8A5A4A',
  shadow: (a) => `rgba(200,100,60,${a})`,
  coreCircle: '#FFE6D6',
  roundBtn: '#FFF1E8',
  roundBtnInset: '#FFDCC8',
  roundBtnIcon: '#9A5B45',
  gear: '#8A5A4A',
  oku: '#E8590C',
  okuInset: '#C2470A',
  gonder: '#0F9D5E',
  gonderInset: '#0B7F4B',
  leaf: '#2BB673',
  leafVein: '#17734A',
};

export const NIGHT: Theme = {
  mode: 'night',
  bg: '#0F2430',
  surface: '#19384A',
  surfaceInset: '#132E3D',
  text: '#EAF6F2',
  muted: '#A7C4C2',
  shadow: (a) => `rgba(0,0,0,${Math.min(0.5, a * 2.2)})`,
  coreCircle: '#FFFFFF',
  roundBtn: '#24485C',
  roundBtnInset: '#1B3B4C',
  roundBtnIcon: '#BFE3E0',
  gear: '#A7C4C2',
  oku: '#E8590C',
  okuInset: '#C2470A',
  gonder: '#12A866',
  gonderInset: '#0B7F4B',
  leaf: '#2E8F63',
  leafVein: '#164D3A',
};

/** All the tints of one category colour, for the current mode. */
export interface Tones {
  base: string;
  pill: string;
  pillInset: string;
  pillShadow: string;
  cardCircle: string;
  cardRing: string | null;
  cardInset: string;
  cardShadow: string;
  navIcon: string;
  navRing: string | null;
  navActive: string;
  navActiveInset: string;
  navActiveShadow: string;
}

export function tones(color: string, theme: Theme): Tones {
  if (theme.mode === 'day') {
    return {
      base: color,
      pill: mix(color, '#FFFFFF', 0.2),
      pillInset: mix(color, '#FFFFFF', 0.38),
      pillShadow: rgba(color, 0.22),
      cardCircle: mix(color, '#FFFFFF', 0.18),
      cardRing: null,
      cardInset: mix(color, '#FFFFFF', 0.14),
      cardShadow: rgba(color, 0.16),
      navIcon: mix(color, '#FFFFFF', 0.22),
      navRing: null,
      navActive: mix(color, '#FFFFFF', 0.3),
      navActiveInset: mix(color, '#FFFFFF', 0.48),
      navActiveShadow: rgba(color, 0.3),
    };
  }
  const s = theme.surface;
  return {
    base: color,
    pill: mix(color, s, 0.3),
    pillInset: mix(color, s, 0.5),
    pillShadow: rgba(color, 0.3),
    cardCircle: '#FFFFFF',
    cardRing: mix(color, s, 0.45),
    cardInset: theme.surfaceInset,
    cardShadow: 'rgba(0,0,0,0.35)',
    navIcon: '#FFFFFF',
    navRing: mix(color, s, 0.55),
    navActive: mix(color, s, 0.42),
    navActiveInset: mix(color, s, 0.6),
    navActiveShadow: rgba(color, 0.3),
  };
}
