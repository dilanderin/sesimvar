import { forwardRef, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
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

// ------------------------------------------------------------- long press

const LONG_PRESS_MS = 450;

/** Hold a card to open its word forms. A normal tap is untouched: the click
 *  that follows a long press is swallowed, any other click goes through. */
function useLongPress(onLong: ((el: HTMLElement) => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const handlers = onLong
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          fired.current = false;
          start.current = { x: e.clientX, y: e.clientY };
          const el = e.currentTarget;
          cancel();
          timer.current = setTimeout(() => {
            fired.current = true;
            timer.current = null;
            onLong(el);
          }, LONG_PRESS_MS);
        },
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
          if (timer.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 12) cancel();
        },
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};
  /** True (once) if this click ends a long press and should be ignored. */
  const consume = () => {
    if (!fired.current) return false;
    fired.current = false;
    return true;
  };
  return { handlers, consume };
}

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
  /** Set when the word has forms and "Kelime çekimleri" is on. */
  onLongPress?: (word: Word, card: HTMLElement) => void;
  /** Phone layout: tighter padding and a smaller label. */
  compact?: boolean;
  children?: ReactNode;
}

export function WordCard({ word, tones, theme, size, ring, jelly, hiddenPicture, onTap, onLongPress, compact, children }: WordCardProps) {
  const lp = useLongPress(onLongPress ? (el) => onLongPress(word, el) : undefined);
  return (
    <button
      type="button"
      className={'kb-card' + (jelly ? ' kb-jelly' : '')}
      aria-label={onLongPress ? `${word.label} (basılı tutunca çekimler)` : word.label}
      {...lp.handlers}
      onClick={(e) => {
        if (lp.consume()) return;
        onTap(word, (e.currentTarget.querySelector('[data-circle]') as HTMLElement) ?? e.currentTarget);
      }}
      style={{
        ...resetButton,
        position: 'relative',
        minHeight: 0,
        minWidth: 0,
        padding: compact ? '6px 4px 8px' : '10px 8px 12px',
        borderRadius: compact ? 22 : 36,
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
          boxShadow: tones.cardRing ? `0 0 0 ${compact ? 3 : 5}px ${tones.cardRing}` : 'none',
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
          fontSize: labelSize(word.label, compact ? 16 : 23),
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
  onLongPress,
  compact,
}: {
  word: Word;
  theme: Theme;
  orientation: Orientation;
  ring: boolean;
  ringColor: string;
  onTap: (word: Word, circle: HTMLElement) => void;
  onLongPress?: (word: Word, card: HTMLElement) => void;
  compact?: boolean;
}) {
  const portrait = orientation === 'portrait';
  const circle = compact ? 34 : portrait ? 50 : 54;
  const lp = useLongPress(onLongPress ? (el) => onLongPress(word, el) : undefined);
  return (
    <button
      type="button"
      className="kb-card"
      aria-label={word.label}
      {...lp.handlers}
      onClick={(e) => {
        if (lp.consume()) return;
        onTap(word, (e.currentTarget.querySelector('[data-circle]') as HTMLElement) ?? e.currentTarget);
      }}
      style={{
        ...resetButton,
        height: compact ? 60 : portrait ? 100 : 90,
        minWidth: 0,
        padding: compact ? '0 2px' : '0 6px',
        borderRadius: compact ? 18 : 30,
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
        <WordPicture picture={word.picture} label={word.label} size={compact ? 30 : 44} />
      </div>
      <span style={{ fontSize: compact ? (word.label.length > 7 ? 11 : 12.5) : portrait ? 18 : 19, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', lineHeight: 1.1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
  /** A chosen word form (e.g. "kolum" for Kol); shown and spoken instead of word.say. */
  form?: string;
}

export const SentenceChip = forwardRef<
  HTMLSpanElement,
  { chip: ChipState; theme: Theme; orientation: Orientation; reading: boolean; motion: boolean; first: boolean; compact?: boolean }
>(function SentenceChip({ chip, theme, orientation, reading, motion, first, compact }, ref) {
  const portrait = orientation === 'portrait';
  const c = compact ? { h: 50, pad: '0 14px 0 6px', r: 18, circle: 38, img: 31, font: 20, gap: 7 } : null;
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
        gap: c ? c.gap : 10,
        height: c ? c.h : portrait ? 72 : 80,
        boxSizing: 'border-box',
        padding: c ? c.pad : portrait ? '0 21px 0 10px' : '0 24px 0 11px',
        borderRadius: c ? c.r : portrait ? 25 : 28,
        background: reading ? t.navActive : t.pill,
        boxShadow: `0 8px 16px ${t.pillShadow}, inset 0 -5px 0 ${t.pillInset}`,
        transform: lift ? `translateY(${c ? -5 : -10}px)` : 'none',
        transition: motion ? 'transform 120ms cubic-bezier(.3,1.6,.5,1), background 120ms' : 'background 100ms',
        flex: 'none',
        visibility: chip.pending ? 'hidden' : 'visible',
      }}
    >
      <div
        data-chip-circle
        style={{
          width: c ? c.circle : portrait ? 52 : 58,
          height: c ? c.circle : portrait ? 52 : 58,
          borderRadius: '50%',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        <WordPicture picture={chip.word.picture} label={chip.word.label} size={c ? c.img : portrait ? 42 : 47} color={t.base} />
      </div>
      <span style={{ fontSize: c ? c.font : portrait ? 26 : 30, fontWeight: 600, color: theme.text, lineHeight: 1, whiteSpace: 'nowrap' }}>
        {first ? upperFirstTr(chip.form ?? chip.word.say) : (chip.form ?? chip.word.say)}
      </span>
      {reading && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '12%',
            right: '12%',
            bottom: c ? (lift ? -9 : -6) : lift ? -16 : -10,
            height: 5,
            borderRadius: 3,
            background: t.base,
          }}
        />
      )}
    </span>
  );
});

export function EmptyHint({ theme, compact }: { theme: Theme; compact?: boolean }) {
  const color = theme.mode === 'day' ? '#8A5A4A' : '#A7C4C2';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 8 : 12,
        height: compact ? 50 : 80,
        boxSizing: 'border-box',
        padding: compact ? '0 14px 0 12px' : '0 26px 0 22px',
        borderRadius: compact ? 18 : 28,
        border: `${compact ? 2 : 3}px dashed ${theme.mode === 'day' ? '#E3C3B2' : '#3B6075'}`,
        color,
        fontSize: compact ? 17 : 24,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flex: 'none',
      }}
    >
      <Hand size={compact ? 20 : 28} strokeWidth={2.4} aria-hidden="true" />
      Bir resme dokun
    </span>
  );
}

export function RoundIconButton({
  label,
  theme,
  onClick,
  children,
  compact,
}: {
  label: string;
  theme: Theme;
  onClick: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="kb-press-small"
      onClick={onClick}
      style={{
        ...resetButton,
        width: compact ? 44 : 52,
        height: compact ? 44 : 52,
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
  compact,
}: {
  kind: 'oku' | 'gonder';
  theme: Theme;
  orientation: Orientation;
  active?: boolean;
  launching?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Phone layout: a small row button (width/height in stage px). */
  compact?: { w: number; h: number };
}) {
  const portrait = orientation === 'portrait' || !!compact;
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
        width: compact ? compact.w : portrait ? (kind === 'oku' ? 200 : 230) : 124,
        height: compact ? compact.h : portrait ? 84 : 118,
        flex: 'none',
        borderRadius: compact ? 22 : portrait ? 32 : 38,
        background: bg,
        ['--kb-shadow' as string]: `0 14px 26px ${glow}, inset 0 -8px 0 ${inset}, inset 0 4px 0 rgba(255,255,255,0.35)`,
        ['--kb-shadow-pressed' as string]: `0 6px 12px ${glow}, inset 0 -3px 0 ${inset}, inset 0 4px 0 rgba(255,255,255,0.35)`,
        display: 'flex',
        flexDirection: portrait ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 7 : portrait ? 12 : 4,
        fontSize: compact ? 18 : portrait ? 24 : 22,
        fontWeight: 600,
        color: '#FFFFFF',
        outline: active ? `${compact ? 5 : 8}px solid ${kind === 'oku' ? 'rgba(232,89,12,0.28)' : 'rgba(15,157,94,0.28)'}` : '0px solid transparent',
        transition: 'outline 300ms ease-out',
      }}
    >
      {kind === 'oku' ? (
        <Volume2 size={compact ? 26 : portrait ? 36 : 40} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <span
          style={{
            position: 'relative',
            width: compact ? 32 : 46,
            height: compact ? 32 : 46,
            flex: 'none',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className={launching ? 'kb-arrow' : undefined} style={{ display: 'flex' }}>
            <ArrowUp size={compact ? 20 : 28} strokeWidth={3.2} color={bg} aria-hidden="true" />
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
  compact,
  pages = 1,
  page = 0,
}: {
  categories: Category[];
  current: string;
  /** Pages of the chosen category (2 with the second page); tapping it again turns the page. */
  pages?: number;
  page?: number;
  theme: Theme;
  orientation: Orientation;
  toneFor: (c: Category) => Tones;
  onSelect: (c: Category) => void;
  /** Phone layout: smaller buttons in a bar that scrolls sideways. */
  compact?: boolean;
}) {
  const portrait = orientation === 'portrait';
  const navRef = useRef<HTMLElement>(null);
  // Keep the chosen category in view when the bar scrolls (phones).
  useEffect(() => {
    if (!compact) return;
    const el = navRef.current?.querySelector('[aria-pressed="true"]') as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [compact, current]);
  return (
    <nav
      ref={navRef}
      aria-label="Kategoriler"
      className={compact ? 'kb-noscrollbar' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 2 : 4,
        padding: compact ? '14px 8px 6px' : portrait ? '9px 10px' : '9px 12px',
        ...(compact ? { overflowX: 'auto', maxWidth: '100%', boxSizing: 'border-box', marginTop: -8 } : null),
        background: theme.surface,
        borderRadius: compact ? 26 : 36,
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
              aria-label={pages > 1 ? `${c.name}, sayfa ${page + 1} / ${pages}. Diğer sayfa için dokun` : undefined}
              onClick={() => onSelect(c)}
              style={{
                ...resetButton,
                position: 'relative',
                flex: 'none',
                height: compact ? 54 : 80,
                padding: compact ? '0 12px 0 6px' : '0 18px 0 10px',
                borderRadius: compact ? 20 : 28,
                background: t.navActive,
                boxShadow: `inset 0 -5px 0 ${t.navActiveInset}, 0 8px 16px ${t.navActiveShadow}`,
                display: 'flex',
                alignItems: 'center',
                gap: compact ? 6 : 10,
              }}
            >
              <svg viewBox="0 0 40 30" width={compact ? 24 : 32} height={compact ? 18 : 24} aria-hidden="true" style={{ position: 'absolute', top: compact ? -11 : -15, right: compact ? 6 : 10 }}>
                <path d="M4 26 C 8 6, 26 2, 38 4 C 34 18, 20 26, 4 26 Z" fill={theme.leaf} />
                <path d="M6 25 C 16 18, 26 10, 36 5" stroke={theme.mode === 'day' ? '#1E8F5A' : theme.leafVein} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
              <div
                style={{
                  width: compact ? 40 : portrait ? 56 : 60,
                  height: compact ? 40 : portrait ? 56 : 60,
                  flex: 'none',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={c.icon} alt="" draggable={false} style={{ width: compact ? 32 : 46, height: compact ? 32 : 46, objectFit: 'contain', display: 'block' }} />
              </div>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: compact ? 4 : 6 }}>
                <span style={{ fontSize: compact ? 15 : portrait ? 17 : 19, fontWeight: 700, color: theme.text, whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {c.name}
                </span>
                {pages > 1 && (
                  <span aria-hidden="true" style={{ display: 'flex', gap: compact ? 4 : 5 }}>
                    {Array.from({ length: pages }, (_, i) => (
                      <span
                        key={i}
                        style={{
                          width: i === page ? (compact ? 14 : 18) : compact ? 7 : 9,
                          height: compact ? 7 : 9,
                          borderRadius: 5,
                          background: i === page ? theme.text : t.navActiveInset,
                          transition: 'width 150ms ease-out',
                        }}
                      />
                    ))}
                  </span>
                )}
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
              width: compact ? 58 : portrait ? 76 : 98,
              height: compact ? 54 : 80,
              borderRadius: compact ? 18 : 24,
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: compact ? 3 : 6,
            }}
          >
            <div
              style={{
                width: compact ? 34 : portrait ? 48 : 52,
                height: compact ? 34 : portrait ? 48 : 52,
                boxSizing: 'border-box',
                borderRadius: compact ? 12 : 17,
                background: t.navIcon,
                boxShadow: t.navRing ? `0 0 0 3px ${t.navRing}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={c.icon} alt="" draggable={false} style={{ width: compact ? 26 : 38, height: compact ? 26 : 38, objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{ fontSize: compact ? 11 : portrait ? 14 : 15, fontWeight: 600, color: theme.mode === 'day' ? theme.text : theme.muted, whiteSpace: 'nowrap', lineHeight: 1 }}>
              {c.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
