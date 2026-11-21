import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { ArrowUp, Delete, Hand, Trash2, Volume2 } from 'lucide-react';
import type { Category, Word } from '../lib/data';
import type { Theme, Tones } from '../lib/theme';
import { upperFirstTr } from '../lib/turkish';
import { WordPicture } from './WordPicture';
import type { Orientation } from './Stage';

const FONT = "'Fredoka', system-ui, sans-serif";

const resetButton: CSSProperties = {
  margin: 0,
  padding: 0,
  border: 0,
  cursor: 'pointer',
  fontFamily: FONT,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

// ---------------------------------------------------------------- word card

export interface CardSizeSpec {
  circle: number;
  img: number;
}

export const CARD_SIZES: Record<'small' | 'medium' | 'large', CardSizeSpec> = {
  small: { circle: 100, img: 80 },
  medium: { circle: 124, img: 100 },
  large: { circle: 144, img: 118 },
};

function labelSize(label: string, base: number) {
  if (label.length > 13) return base - 5;
  if (label.length > 10) return base - 2;
  return base;
}

interface WordCardProps {
  word: Word;
  tones: Tones;
  theme: Theme;
  size: CardSizeSpec;
  ring: boolean;
  jelly: boolean;
  hiddenPicture?: boolean;
  onTap: (word: Word, circle: HTMLElement) => void;
  children?: ReactNode;
}

export function WordCard({ word, tones, theme, size, ring, jelly, hiddenPicture, onTap, children }: WordCardProps) {
  return (
    <button
      type="button"
      className={'kb-card' + (jelly ? ' kb-jelly' : '')}
      aria-label={word.label}
      onClick={(e) => onTap(word, (e.currentTarget.querySelector('[data-circle]') as HTMLElement) ?? e.currentTarget)}
      style={{
        ...resetButton,
        position: 'relative',
        minHeight: 0,
        minWidth: 0,
        padding: '10px 8px 12px',
        borderRadius: 36,
        background: theme.surface,
        ['--kb-shadow' as string]: `0 12px 24px ${tones.cardShadow}`,
        ['--kb-shadow-pressed' as string]: `0 5px 10px ${tones.cardShadow}`,
        ['--kb-inset' as string]: tones.cardInset,
        boxShadow: ring ? `0 0 0 4px ${tones.base}, 0 12px 24px ${tones.cardShadow}, inset 0 -6px 0 ${tones.cardInset}` : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'box-shadow 100ms linear',
      }}
    >
      <div
        data-circle
        style={{
          width: size.circle,
          height: size.circle,
          borderRadius: '50%',
          background: tones.cardCircle,
          boxShadow: tones.cardRing ? `0 0 0 5px ${tones.cardRing}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        <span style={{ visibility: hiddenPicture ? 'hidden' : 'visible', display: 'flex' }}>
          <WordPicture picture={word.picture} label={word.label} size={size.img} color={tones.base} />
        </span>
      </div>
      <span
        style={{
          fontSize: labelSize(word.label, 23),
          fontWeight: 600,
          color: theme.text,
          whiteSpace: 'nowrap',
          lineHeight: 1,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {word.label}
      </span>
      {children}
    </button>
  );
}

// ----------------------------------------------------------- core row tile

export function CoreTile({
  word,
  theme,
  orientation,
  ring,
  ringColor,
  onTap,
}: {
  word: Word;
  theme: Theme;
  orientation: Orientation;
  ring: boolean;
  ringColor: string;
  onTap: (word: Word, circle: HTMLElement) => void;
}) {
  const portrait = orientation === 'portrait';
  const circle = portrait ? 50 : 54;
  return (
    <button
      type="button"
      className="kb-card"
      aria-label={word.label}
      onClick={(e) => onTap(word, (e.currentTarget.querySelector('[data-circle]') as HTMLElement) ?? e.currentTarget)}
      style={{
        ...resetButton,
        height: portrait ? 100 : 90,
        minWidth: 0,
        padding: '0 6px',
        borderRadius: 30,
        background: theme.surface,
        ['--kb-shadow' as string]: `0 8px 18px ${theme.shadow(0.1)}`,
        ['--kb-shadow-pressed' as string]: `0 3px 8px ${theme.shadow(0.1)}`,
        ['--kb-inset' as string]: theme.surfaceInset,
        boxShadow: ring ? `0 0 0 4px ${ringColor}, inset 0 -5px 0 ${theme.surfaceInset}` : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <div
        data-circle
        style={{
          width: circle,
          height: circle,
          borderRadius: '50%',
          background: theme.coreCircle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <WordPicture picture={word.picture} label={word.label} size={44} />
      </div>
      <span style={{ fontSize: portrait ? 18 : 19, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', lineHeight: 1.1 }}>
        {word.label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- balloon

export interface ChipState {
  uid: string;
  word: Word;
  tones: Tones;
  /** Reserved in the layout but not yet shown (the picture is flying in). */
  pending: boolean;
  popping: boolean;
}

export const SentenceChip = forwardRef<
  HTMLSpanElement,
  { chip: ChipState; theme: Theme; orientation: Orientation; reading: boolean; motion: boolean; first: boolean }
>(function SentenceChip({ chip, theme, orientation, reading, motion, first }, ref) {
  const portrait = orientation === 'portrait';
  const t = chip.tones;
  const lift = reading && motion;
  return (
    <span
      ref={ref}
      data-uid={chip.uid}
      className={chip.popping && motion ? 'kb-pop' : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        height: portrait ? 72 : 80,
        boxSizing: 'border-box',
        padding: portrait ? '0 21px 0 10px' : '0 24px 0 11px',
        borderRadius: portrait ? 25 : 28,
        background: reading ? t.navActive : t.pill,
        boxShadow: `0 8px 16px ${t.pillShadow}, inset 0 -5px 0 ${t.pillInset}`,
        transform: lift ? 'translateY(-10px)' : 'none',
        transition: motion ? 'transform 120ms cubic-bezier(.3,1.6,.5,1), background 120ms' : 'background 100ms',
        flex: 'none',
        visibility: chip.pending ? 'hidden' : 'visible',
      }}
    >
      <div
        data-chip-circle
        style={{
          width: portrait ? 52 : 58,
          height: portrait ? 52 : 58,
          borderRadius: '50%',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        <WordPicture picture={chip.word.picture} label={chip.word.label} size={portrait ? 42 : 47} color={t.base} />
      </div>
      <span style={{ fontSize: portrait ? 26 : 30, fontWeight: 600, color: theme.text, lineHeight: 1, whiteSpace: 'nowrap' }}>
        {first ? upperFirstTr(chip.word.say) : chip.word.say}
      </span>
      {reading && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '12%',
            right: '12%',
            bottom: lift ? -16 : -10,
            height: 5,
            borderRadius: 3,
            background: t.base,
          }}
        />
      )}
    </span>
  );
});

export function EmptyHint({ theme }: { theme: Theme }) {
  const color = theme.mode === 'day' ? '#8A5A4A' : '#A7C4C2';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        height: 80,
        boxSizing: 'border-box',
        padding: '0 26px 0 22px',
        borderRadius: 28,
        border: `3px dashed ${theme.mode === 'day' ? '#E3C3B2' : '#3B6075'}`,
        color,
        fontSize: 24,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flex: 'none',
      }}
    >
      <Hand size={28} strokeWidth={2.4} aria-hidden="true" />
      Bir resme dokun
    </span>
  );
}

export function RoundIconButton({
  label,
  theme,
  onClick,
  children,
}: {
  label: string;
  theme: Theme;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="kb-press-small"
      onClick={onClick}
      style={{
        ...resetButton,
        width: 52,
        height: 52,
        flex: 'none',
        borderRadius: '50%',
        background: theme.roundBtn,
        boxShadow: `inset 0 -4px 0 ${theme.roundBtnInset}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.roundBtnIcon,
      }}
    >
      {children}
    </button>
  );
}

export const BackspaceIcon = () => <Delete size={22} strokeWidth={2.4} aria-hidden="true" />;
export const TrashIcon = () => <Trash2 size={22} strokeWidth={2.4} aria-hidden="true" />;

// ------------------------------------------------------- Oku / Gönder

export function ActionButton({
  kind,
  theme,
  orientation,
  active,
  launching,
  disabled,
  onClick,
}: {
  kind: 'oku' | 'gonder';
  theme: Theme;
  orientation: Orientation;
  active?: boolean;
  launching?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const portrait = orientation === 'portrait';
  const bg = kind === 'oku' ? theme.oku : theme.gonder;
  const inset = kind === 'oku' ? theme.okuInset : theme.gonderInset;
  const glow = kind === 'oku' ? 'rgba(232,89,12,0.35)' : theme.mode === 'day' ? 'rgba(15,157,94,0.32)' : 'rgba(18,168,102,0.35)';
  const label = kind === 'oku' ? 'Oku' : 'Gönder';
  return (
    <button
      type="button"
      className="kb-action"
      onClick={onClick}
      aria-disabled={disabled || undefined}
      style={{
        ...resetButton,
        position: 'relative',
        width: portrait ? (kind === 'oku' ? 200 : 230) : 124,
        height: portrait ? 84 : 118,
        flex: 'none',
        borderRadius: portrait ? 32 : 38,
        background: bg,
        ['--kb-shadow' as string]: `0 14px 26px ${glow}, inset 0 -8px 0 ${inset}, inset 0 4px 0 rgba(255,255,255,0.35)`,
        ['--kb-shadow-pressed' as string]: `0 6px 12px ${glow}, inset 0 -3px 0 ${inset}, inset 0 4px 0 rgba(255,255,255,0.35)`,
        display: 'flex',
        flexDirection: portrait ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: portrait ? 12 : 4,
        fontSize: portrait ? 24 : 22,
        fontWeight: 600,
        color: '#FFFFFF',
        outline: active ? `8px solid ${kind === 'oku' ? 'rgba(232,89,12,0.28)' : 'rgba(15,157,94,0.28)'}` : '0px solid transparent',
        transition: 'outline 300ms ease-out',
      }}
    >
      {kind === 'oku' ? (
        <Volume2 size={portrait ? 36 : 40} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <span
          style={{
            position: 'relative',
            width: 46,
            height: 46,
            flex: 'none',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className={launching ? 'kb-arrow' : undefined} style={{ display: 'flex' }}>
            <ArrowUp size={28} strokeWidth={3.2} color={bg} aria-hidden="true" />
          </span>
          {launching && (
            <span className="kb-speedlines" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}

// ------------------------------------------------------ category tab bar

export function CategoryNav({
  categories,
  current,
  theme,
  orientation,
  toneFor,
  onSelect,
}: {
  categories: Category[];
  current: string;
  theme: Theme;
  orientation: Orientation;
  toneFor: (c: Category) => Tones;
  onSelect: (c: Category) => void;
}) {
  const portrait = orientation === 'portrait';
  return (
    <nav
      aria-label="Kategoriler"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: portrait ? '9px 10px' : '9px 12px',
        background: theme.surface,
        borderRadius: 36,
        boxShadow: `0 18px 40px ${theme.shadow(0.2)}, inset 0 -5px 0 ${theme.surfaceInset}`,
      }}
    >
      {categories.map((c) => {
        const t = toneFor(c);
        const active = c.id === current;
        if (active) {
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed="true"
              onClick={() => onSelect(c)}
              style={{
                ...resetButton,
                position: 'relative',
                flex: 'none',
                height: 80,
                padding: '0 18px 0 10px',
                borderRadius: 28,
                background: t.navActive,
                boxShadow: `inset 0 -5px 0 ${t.navActiveInset}, 0 8px 16px ${t.navActiveShadow}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg viewBox="0 0 40 30" width="32" height="24" aria-hidden="true" style={{ position: 'absolute', top: -15, right: 10 }}>
                <path d="M4 26 C 8 6, 26 2, 38 4 C 34 18, 20 26, 4 26 Z" fill={theme.leaf} />
                <path d="M6 25 C 16 18, 26 10, 36 5" stroke={theme.mode === 'day' ? '#1E8F5A' : theme.leafVein} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
              <div
                style={{
                  width: portrait ? 56 : 60,
                  height: portrait ? 56 : 60,
                  flex: 'none',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={c.icon} alt="" draggable={false} style={{ width: 46, height: 46, objectFit: 'contain', display: 'block' }} />
              </div>
              <span style={{ fontSize: portrait ? 17 : 19, fontWeight: 700, color: theme.text, whiteSpace: 'nowrap', lineHeight: 1 }}>
                {c.name}
              </span>
            </button>
          );
        }
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed="false"
            onClick={() => onSelect(c)}
            style={{
              ...resetButton,
              flex: 'none',
              width: portrait ? 76 : 98,
              height: 80,
              borderRadius: 24,
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: portrait ? 48 : 52,
                height: portrait ? 48 : 52,
                boxSizing: 'border-box',
                borderRadius: 17,
                background: t.navIcon,
                boxShadow: t.navRing ? `0 0 0 3px ${t.navRing}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={c.icon} alt="" draggable={false} style={{ width: 38, height: 38, objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{ fontSize: portrait ? 14 : 15, fontWeight: 600, color: theme.mode === 'day' ? theme.text : theme.muted, whiteSpace: 'nowrap', lineHeight: 1 }}>
              {c.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
