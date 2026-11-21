import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, History, Settings as SettingsIcon, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_BY_ID, SLOTS_PER_CATEGORY, type Category, type CategoryId, type Word } from '../lib/data';
import { DECOR } from '../lib/decor';
import { saySentence, sayWord, stopSpeaking, unlockAudio } from '../lib/speech';
import { isValidAddress, sentenceText, smsUrl } from '../lib/messages';
import { clearHistory, rememberSentence, useAppState } from '../lib/store';
import { tones, type Theme, type Tones } from '../lib/theme';
import {
  ActionButton,
  BackspaceIcon,
  CARD_SIZES,
  CategoryNav,
  CoreTile,
  EmptyHint,
  RoundIconButton,
  SentenceChip,
  TrashIcon,
  WordCard,
  type ChipState,
} from './BoardParts';
import { Confetti, Flyer, Sparkles } from './Effects';
import { Parrot, ParrotLeaf, type ParrotPose } from './Parrot';
import { WordPicture } from './WordPicture';
import { upperFirstTr } from '../lib/turkish';
import { STAGE, toStageRect, useStage } from './Stage';

type Rect = { x: number; y: number; w: number; h: number };

interface Flight {
  uid: string;
  word: Word;
  from: Rect;
  to: Rect;
  circle: string;
}

let uidCounter = 0;
const nextUid = () => `c${++uidCounter}`;

const IDLE_BEFORE_CHEEKY_MS = 25_000;
const SETTINGS_HOLD_MS = 2_000;

export function Board({ theme, onOpenSettings }: { theme: Theme; onOpenSettings: () => void }) {
  const { words, settings, history } = useAppState();
  const { orientation, scale } = useStage();
  const portrait = orientation === 'portrait';
  const motion = settings.motion;
  const size = CARD_SIZES[settings.size];

  const [categoryId, setCategoryId] = useState<CategoryId>('temel');
  const [chips, setChips] = useState<ChipState[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [sparkles, setSparkles] = useState<{ id: number; rect: Rect; color: string }[]>([]);
  const [jellyId, setJellyId] = useState<string | null>(null);
  const [ringId, setRingId] = useState<string | null>(null);
  const [pose, setPose] = useState<ParrotPose>('idle');
  const [readingIdx, setReadingIdx] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [sent, setSent] = useState(false);
  const [holding, setHolding] = useState(false);

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  }, []);
  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      stopSpeaking();
    };
  }, []);

  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const lastActivity = useRef(Date.now());
  const lastTapAt = useRef(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const poseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Show a pose, then drift back to idle. */
  const showPose = useCallback(
    (p: ParrotPose, ms?: number) => {
      setPose(p);
      if (poseTimer.current) clearTimeout(poseTimer.current);
      poseTimer.current = ms ? setTimeout(() => setPose('idle'), ms) : null;
    },
    [],
  );

  // After a while without touches, the parrot gets cheeky for a moment.
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_BEFORE_CHEEKY_MS) {
        lastActivity.current = Date.now();
        setPose((p) => {
          if (p !== 'idle') return p;
          if (poseTimer.current) clearTimeout(poseTimer.current);
          poseTimer.current = setTimeout(() => setPose('idle'), 2500);
          return 'cheeky';
        });
      }
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const toneFor = useCallback((c: Category) => tones(c.color, theme), [theme]);
  const tonesForWord = useCallback(
    (w: Word): Tones => tones(CATEGORY_BY_ID[w.category === 'core' ? 'temel' : w.category].color, theme),
    [theme],
  );

  const category = CATEGORY_BY_ID[categoryId];
  const catTones = toneFor(category);
  const slots = useMemo(() => {
    const arr: (Word | null)[] = Array.from({ length: SLOTS_PER_CATEGORY }, () => null);
    for (const w of words) if (w.category === categoryId && !w.hidden && w.slot < SLOTS_PER_CATEGORY) arr[w.slot] = w;
    return arr;
  }, [words, categoryId]);
  const coreWords = useMemo(
    () => settings.core.map((id) => words.find((w) => w.id === id)).filter((w): w is Word => !!w),
    [settings.core, words],
  );

  // Keep sentence words in sync with edits made in Ayarlar; drop deleted ones.
  useEffect(() => {
    setChips((cs) => {
      const next = cs.flatMap((c) => {
        const w = words.find((x) => x.id === c.word.id);
        return w ? [{ ...c, word: w }] : [];
      });
      return next.length === cs.length && next.every((c, i) => c.word === cs[i].word) ? cs : next;
    });
  }, [words]);

  // Keep the newest word in view when the sentence gets long.
  const rowRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row) row.scrollLeft = row.scrollWidth;
  }, [chips.length]);

  const stopReading = useCallback(() => {
    if (readingIdx !== null) {
      stopSpeaking();
      setReadingIdx(null);
      showPose('idle');
    }
  }, [readingIdx, showPose]);

  // ------------------------------------------------------------ tap a word
  const tap = useCallback(
    (word: Word, circleEl: HTMLElement) => {
      unlockAudio();
      const now = Date.now();
      // Accidental-tap protection: ignore another card tap that comes too soon.
      if (settings.tapGuardMs && now - lastTapAt.current < settings.tapGuardMs) return;
      lastTapAt.current = now;
      lastActivity.current = now;
      stopReading();
      const t = tonesForWord(word);
      const uid = nextUid();

      if (!motion) {
        // Calm mode: a ring around the card, the word appears at once.
        setRingId(word.id);
        later(500, () => setRingId((r) => (r === word.id ? null : r)));
        setChips((cs) => [...cs, { uid, word, tones: t, pending: false, popping: false }]);
        void sayWord(word, settings.voiceURI);
        return;
      }

      const from = toStageRect(circleEl, scale);
      // 80–300 ms: jelly + sparkles; the parrot looks at the card.
      setJellyId(word.id);
      later(320, () => setJellyId((j) => (j === word.id ? null : j)));
      const sid = Date.now() + Math.random();
      setSparkles((s) => [...s, { id: sid, rect: from, color: t.base }]);
      later(520, () => setSparkles((s) => s.filter((x) => x.id !== sid)));
      showPose('look');
      setChips((cs) => [...cs, { uid, word, tones: t, pending: true, popping: false }]);

      // 300–600 ms: the picture flies to its place in the balloon.
      later(300, () => {
        const target = document.querySelector(`[data-uid="${uid}"] [data-chip-circle]`);
        if (!target) return;
        const to = toStageRect(target, scale);
        const circle = theme.mode === 'day' ? t.cardCircle : '#FFFFFF';
        setFlights((f) => [...f, { uid, word, from, to, circle }]);
      });
    },
    [later, motion, scale, settings.tapGuardMs, settings.voiceURI, showPose, stopReading, theme.mode, tonesForWord],
  );

  // 600–850 ms: the chip lands with a pop, the parrot hops and says the word.
  const land = useCallback(
    (flight: Flight) => {
      setFlights((f) => f.filter((x) => x.uid !== flight.uid));
      if (!chipsRef.current.some((c) => c.uid === flight.uid)) return;
      setChips((cs) => cs.map((c) => (c.uid === flight.uid ? { ...c, pending: false, popping: true } : c)));
      later(260, () => setChips((cs) => cs.map((c) => (c.uid === flight.uid ? { ...c, popping: false } : c))));
      showPose('hop', 420);
      void sayWord(flight.word, settings.voiceURI);
    },
    [later, settings.voiceURI, showPose],
  );

  // --------------------------------------------------------------- Oku
  const read = useCallback(async (fresh = false) => {
    unlockAudio();
    lastActivity.current = Date.now();
    if (!fresh && readingIdx !== null) return stopReading();
    const list = chipsRef.current.filter((c) => !c.pending);
    if (!list.length) {
      showPose('look', 700);
      return;
    }
    rememberSentence(list.map((c) => c.word.id));
    setReadingIdx(0);
    if (motion) showPose('talk');
    const finished = await saySentence(
      list.map((c) => c.word),
      settings.voiceURI,
      (i) => setReadingIdx(i),
    );
    if (!finished) return;
    later(300, () => {
      setReadingIdx(null);
      showPose('idle');
    });
  }, [later, motion, readingIdx, settings.voiceURI, showPose, stopReading]);

  // ------------------------------------------------- Son cümleler (history)
  const recent = useMemo(
    () =>
      (history ?? [])
        .map((ids) => ids.map((id) => words.find((w) => w.id === id)).filter((w): w is Word => !!w))
        .filter((ws) => ws.length > 0),
    [history, words],
  );

  /** Put a recent sentence back in the balloon and read it. */
  const replay = useCallback(
    (ws: Word[]) => {
      setHistoryOpen(false);
      stopSpeaking();
      setReadingIdx(null);
      setFlights([]);
      const next = ws.map((w) => ({ uid: nextUid(), word: w, tones: tonesForWord(w), pending: false, popping: false }));
      chipsRef.current = next;
      setChips(next);
      void read(true);
    },
    [read, tonesForWord],
  );

  // ------------------------------------------------------------- Gönder
  const send = useCallback(() => {
    unlockAudio();
    lastActivity.current = Date.now();
    const list = chipsRef.current.filter((c) => !c.pending);
    if (!list.length || launching) return;
    rememberSentence(list.map((c) => c.word.id));
    stopSpeaking();
    setReadingIdx(null);
    const to = settings.sendTo?.address ?? '';
    if (isValidAddress(to)) {
      // Open Messages with the sentence written and addressed; the person taps send there.
      // This must happen inside the tap, or iOS blocks it.
      window.location.href = smsUrl(to, sentenceText(list.map((c) => c.word)));
    } else {
      void saySentence(
        list.map((c) => c.word),
        settings.voiceURI,
        () => undefined,
      );
    }
    const finish = () => {
      setChips([]);
      setFlights([]);
      setSent(true);
      later(1600, () => setSent(false));
    };
    if (!motion) {
      finish();
      return;
    }
    setLaunching(true);
    later(260, () => setLaunching(false));
    setConfetti((n) => n + 1);
    showPose('celebrate');
    later(1300, () => {
      finish();
      setConfetti(0);
      showPose('cheeky', 1400);
    });
  }, [later, launching, motion, settings.sendTo, settings.voiceURI, showPose]);

  const backspace = () => {
    lastActivity.current = Date.now();
    stopReading();
    setChips((cs) => cs.slice(0, -1));
  };
  const clearAll = () => {
    lastActivity.current = Date.now();
    stopReading();
    setChips([]);
    setFlights([]);
  };

  // ----------------------------------------------- settings gear (hold 2 s)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHold = () => {
    if (!settings.locked) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      onOpenSettings();
    }, SETTINGS_HOLD_MS);
  };
  const endHold = () => {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const decor = DECOR[`${theme.mode}${portrait ? 'Portrait' : 'Landscape'}` as keyof typeof DECOR];
  const { w: stageW, h: stageH } = STAGE[orientation];

  // ------------------------------------------------------------- pieces
  const parrotBlock = (
    <div style={{ position: 'relative', zIndex: 1, flex: 'none', width: 148, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: -40, position: 'relative', zIndex: 2 }}>
        <Parrot pose={pose} name={settings.parrotName} motion={motion} />
      </div>
      <div style={{ position: 'relative', width: 180, height: 66, marginTop: -6 }}>
        <ParrotLeaf fill={theme.leaf} vein={theme.leafVein} />
      </div>
    </div>
  );

  const balloon = (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        minWidth: 0,
        height: portrait ? 114 : 120,
        marginBottom: portrait ? 18 : 30,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px 0 22px',
        background: theme.surface,
        borderRadius: 42,
        boxShadow: `0 16px 32px ${theme.shadow(0.14)}, inset 0 -6px 0 ${theme.surfaceInset}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -12,
          top: portrait ? 45 : 48,
          width: 26,
          height: 26,
          background: theme.surface,
          borderRadius: 6,
          transform: 'rotate(45deg)',
        }}
      />
      <div
        ref={rowRef}
        role="list"
        aria-label="Cümle"
        aria-live="polite"
        className="kb-noscrollbar"
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          overflowX: 'auto',
          overflowY: 'visible',
          padding: '0 4px',
          margin: '0 -4px',
        }}
      >
        {chips.length === 0 && !sent && <EmptyHint theme={theme} />}
        {chips.length === 0 && sent && (
          <span
            className={motion ? 'kb-pop' : undefined}
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              height: 64,
              padding: '0 28px 0 12px',
              borderRadius: 32,
              background: theme.gonder,
              boxShadow: `inset 0 -5px 0 ${theme.gonderInset}`,
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: 600,
              flex: 'none',
            }}
          >
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={28} strokeWidth={3.4} color={theme.gonder} aria-hidden="true" />
            </span>
            Gönderildi
          </span>
        )}
        {chips.map((c, i) => (
          <span role="listitem" key={c.uid} style={{ display: 'flex', flex: 'none' }}>
            <SentenceChip chip={c} theme={theme} orientation={orientation} reading={readingIdx === i} motion={motion} first={i === 0} />
          </span>
        ))}
      </div>
      <RoundIconButton label="Son cümleler" theme={theme} onClick={() => setHistoryOpen((o) => !o)}>
        <History size={22} strokeWidth={2.4} aria-hidden="true" />
      </RoundIconButton>
      <RoundIconButton label="Son kelimeyi sil" theme={theme} onClick={backspace}>
        <BackspaceIcon />
      </RoundIconButton>
      <RoundIconButton label="Hepsini temizle" theme={theme} onClick={clearAll}>
        <TrashIcon />
      </RoundIconButton>
    </div>
  );

  const okuBtn = (
    <ActionButton kind="oku" theme={theme} orientation={orientation} active={readingIdx !== null} disabled={!chips.length} onClick={() => void read()} />
  );
  const gonderBtn = (
    <ActionButton kind="gonder" theme={theme} orientation={orientation} launching={launching} disabled={!chips.length} onClick={send} />
  );

  const gear = (
    <button
      type="button"
      aria-label={settings.locked ? 'Ayarlar (açmak için 2 saniye basılı tut)' : 'Ayarlar'}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!settings.locked) onOpenSettings();
      }}
      style={{
        width: 40,
        height: 40,
        padding: 0,
        border: 0,
        margin: 0,
        background: 'transparent',
        color: theme.gear,
        opacity: holding ? 1 : 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 8,
        right: 12,
        zIndex: 3,
        cursor: 'pointer',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      <SettingsIcon size={20} strokeWidth={2.6} aria-hidden="true" />
      {holding && (
        <svg className="kb-hold" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="20" cy="20" r="17" fill="none" stroke={theme.gear} strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray="100" />
        </svg>
      )}
    </button>
  );

  const header = portrait ? (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 'none',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '150px minmax(0, 1fr)',
        gridTemplateRows: 'auto auto',
        columnGap: 14,
        padding: '86px 22px 0 14px',
      }}
    >
      <div style={{ gridRow: '1 / span 2', alignSelf: 'end', marginBottom: 16 }}>{parrotBlock}</div>
      <div style={{ display: 'flex' }}>{balloon}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, paddingBottom: 24 }}>
        {okuBtn}
        {gonderBtn}
      </div>
      {gear}
    </div>
  ) : (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 'none',
        height: 214,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 20,
        padding: '16px 28px 0 22px',
      }}
    >
      <div style={{ marginBottom: 20 }}>{parrotBlock}</div>
      {balloon}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 20, alignItems: 'flex-end', marginBottom: 30 }}>
        {okuBtn}
        {gonderBtn}
      </div>
      {gear}
    </div>
  );

  const coreRow = (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: portrait ? 10 : 14,
        padding: portrait ? '8px 22px 0' : '0 30px',
      }}
    >
      {coreWords.map((w) => (
        <CoreTile key={w.id} word={w} theme={theme} orientation={orientation} ring={ringId === w.id} ringColor={tonesForWord(w).base} onTap={tap} />
      ))}
    </div>
  );

  const gridStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: `repeat(${portrait ? 4 : 6}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${portrait ? 3 : 2}, minmax(0, 1fr))`,
    columnGap: 18,
    rowGap: portrait ? 18 : 20,
    padding: portrait ? '22px 30px 18px' : '22px 30px 20px',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: stageW,
        height: stageH,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: theme.bg,
        fontFamily: "'Fredoka', system-ui, sans-serif",
        color: theme.text,
      }}
    >
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: decor }} />
      {header}
      {coreRow}
      <section aria-label={`${category.name} kelimeleri`} style={gridStyle}>
        {slots.map((w, i) =>
          w ? (
            <WordCard
              key={w.id}
              word={w}
              tones={catTones}
              theme={theme}
              size={size}
              ring={ringId === w.id}
              jelly={jellyId === w.id}
              onTap={tap}
            />
          ) : (
            <div key={`empty-${i}`} aria-hidden="true" />
          ),
        )}
      </section>
      <div style={{ position: 'relative', zIndex: 1, flex: 'none', display: 'flex', justifyContent: 'center', padding: '0 0 14px' }}>
        <CategoryNav
          categories={CATEGORIES}
          current={categoryId}
          theme={theme}
          orientation={orientation}
          toneFor={toneFor}
          onSelect={(c) => {
            lastActivity.current = Date.now();
            setCategoryId(c.id);
          }}
        />
      </div>

      {historyOpen && (
        <>
          <div aria-hidden="true" onClick={() => setHistoryOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 20 }} />
          <div
            role="dialog"
            aria-label="Son cümleler"
            className={motion ? 'kb-pop' : undefined}
            style={{
              position: 'absolute',
              zIndex: 21,
              top: portrait ? 214 : 196,
              left: portrait ? 22 : 190,
              right: portrait ? 22 : 318,
              maxHeight: portrait ? 560 : 440,
              display: 'flex',
              flexDirection: 'column',
              background: theme.surface,
              borderRadius: 32,
              boxShadow: `0 24px 48px ${theme.shadow(0.28)}, inset 0 -6px 0 ${theme.surfaceInset}`,
              padding: '16px 16px 18px',
              transformOrigin: 'top center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 10px' }}>
              <History size={22} strokeWidth={2.6} color={theme.muted} aria-hidden="true" />
              <span style={{ flex: 1, fontSize: 22, fontWeight: 700, color: theme.text }}>Son cümleler</span>
              {recent.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearHistory()}
                  style={{ margin: 0, border: 0, background: 'transparent', color: theme.muted, fontFamily: 'inherit', fontSize: 16, fontWeight: 600, padding: '10px 8px', cursor: 'pointer' }}
                >
                  Temizle
                </button>
              )}
              <RoundIconButton label="Kapat" theme={theme} onClick={() => setHistoryOpen(false)}>
                <X size={22} strokeWidth={2.6} aria-hidden="true" />
              </RoundIconButton>
            </div>
            <div className="kb-noscrollbar" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.length === 0 && (
                <p style={{ margin: '8px 6px 4px', fontSize: 18, fontWeight: 500, color: theme.muted, lineHeight: 1.4 }}>
                  Henüz cümle yok. Oku ya da Gönder’e basınca cümleler burada görünür; bir dokunuşla tekrar söylenir.
                </p>
              )}
              {recent.map((ws, i) => (
                <button
                  key={i}
                  type="button"
                  className="kb-press-small"
                  aria-label={`Tekrar söyle: ${ws.map((w) => w.say).join(' ')}`}
                  onClick={() => replay(ws)}
                  style={{
                    margin: 0,
                    border: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 64,
                    padding: '8px 12px',
                    borderRadius: 22,
                    background: theme.mode === 'day' ? theme.surfaceInset : theme.roundBtn,
                    textAlign: 'left',
                  }}
                >
                  {ws.map((w, j) => {
                    const t = tonesForWord(w);
                    return (
                      <span
                        key={j}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 48, padding: '0 14px 0 6px', borderRadius: 18, background: t.pill, flex: 'none' }}
                      >
                        <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <WordPicture picture={w.picture} label={w.label} size={32} color={t.base} />
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap' }}>{j === 0 ? upperFirstTr(w.say) : w.say}</span>
                      </span>
                    );
                  })}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {sparkles.map((s) => (
        <Sparkles key={s.id} rect={s.rect} color={s.color} />
      ))}
      {flights.map((f) => (
        <Flyer key={f.uid} word={f.word} from={f.from} to={f.to} circleColor={f.circle} onDone={() => land(f)} />
      ))}
      {confetti > 0 && <Confetti key={confetti} width={stageW} height={stageH} />}
    </div>
  );
}
