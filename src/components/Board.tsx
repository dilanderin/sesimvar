import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, History, Settings as SettingsIcon, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_BY_ID, SLOTS_PER_CATEGORY, type Category, type CategoryId, type Word } from '../lib/data';
import { DECOR } from '../lib/decor';
import { preloadClips, saySentence, sayWord, stopSpeaking, unlockAudio } from '../lib/speech';
import { wordForms } from '../lib/forms';
import { isValidAddress, openMessages, sentenceText, smsUrl } from '../lib/messages';
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
import { toStageRect, useStage } from './Stage';

type Rect = { x: number; y: number; w: number; h: number };

/** A word as it is said in the sentence: its chosen form, without the base word's recording. */
const spoken = (w: Word, form?: string): Word => (form ? { ...w, say: form, recording: undefined } : w);
/** History entries are "id" or "id::form". */
const historyKey = (c: { word: Word; form?: string }) => (c.form ? `${c.word.id}::${c.form}` : c.word.id);

interface Said {
  word: Word;
  form?: string;
}

interface Flight {
  uid: string;
  word: Word;
  from: Rect;
  to: Rect;
  circle: string;
  form?: string;
}

let uidCounter = 0;
const nextUid = () => `c${++uidCounter}`;

const IDLE_BEFORE_CHEEKY_MS = 25_000;
const SETTINGS_HOLD_MS = 2_000;

export function Board({ theme, onOpenSettings }: { theme: Theme; onOpenSettings: () => void }) {
  const { words, settings, history } = useAppState();
  const { orientation, scale, phone, w: stageW, h: stageH } = useStage();
  const portrait = orientation === 'portrait';
  const motion = settings.motion;
  const size = phone ? phoneCardSize(settings.size, orientation, stageH) : CARD_SIZES[settings.size];

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
  const [formsFor, setFormsFor] = useState<{ word: Word; rect: Rect } | null>(null);
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
  // Keep the voice clips of everything on screen in memory, so a tap speaks at once.
  useEffect(() => {
    const onScreen = [...coreWords, ...slots.filter((w): w is Word => !!w)];
    preloadClips(settings.voicePack, onScreen.map((w) => w.say));
    if (settings.wordForms) preloadClips(settings.voicePack, onScreen.flatMap((w) => wordForms(w)));
  }, [coreWords, slots, settings.voicePack, settings.wordForms]);

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
    (word: Word, circleEl: HTMLElement, form?: string) => {
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
        setChips((cs) => [...cs, { uid, word, tones: t, pending: false, popping: false, form }]);
        void sayWord(spoken(word, form), settings.voiceURI);
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
      // Say the word right away; the picture flies to the balloon meanwhile.
      void sayWord(spoken(word, form), settings.voiceURI);
      setChips((cs) => [...cs, { uid, word, tones: t, pending: true, popping: false, form }]);

      // 300–600 ms: the picture flies to its place in the balloon.
      later(300, () => {
        const target = document.querySelector(`[data-uid="${uid}"] [data-chip-circle]`);
        if (!target) return;
        const to = toStageRect(target, scale);
        const circle = theme.mode === 'day' ? t.cardCircle : '#FFFFFF';
        setFlights((f) => [...f, { uid, word, from, to, circle, form }]);
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
    },
    [later, showPose],
  );

  // ------------------------------------------------ word forms (hold a card)
  const openForms = useCallback(
    (word: Word, card: HTMLElement) => {
      unlockAudio();
      lastActivity.current = Date.now();
      setFormsFor({ word, rect: toStageRect(card, scale) });
    },
    [scale],
  );
  const longPressFor = (w: Word) => (settings.wordForms && wordForms(w).length ? openForms : undefined);

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
    rememberSentence(list.map(historyKey));
    setReadingIdx(0);
    if (motion) showPose('talk');
    const finished = await saySentence(
      list.map((c) => spoken(c.word, c.form)),
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
        .map((keys) =>
          keys.flatMap((key): Said[] => {
            const [id, form] = key.split('::');
            const word = words.find((w) => w.id === id);
            return word ? [{ word, form: form || undefined }] : [];
          }),
        )
        .filter((ws) => ws.length > 0),
    [history, words],
  );

  /** Put a recent sentence back in the balloon and read it. */
  const replay = useCallback(
    (ws: Said[]) => {
      setHistoryOpen(false);
      stopSpeaking();
      setReadingIdx(null);
      setFlights([]);
      const next = ws.map(({ word, form }) => ({ uid: nextUid(), word, form, tones: tonesForWord(word), pending: false, popping: false }));
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
    rememberSentence(list.map(historyKey));
    stopSpeaking();
    setReadingIdx(null);
    const to = settings.sendTo?.address ?? '';
    if (isValidAddress(to)) {
      // Open Messages with the sentence written and addressed; the person taps send there.
      // This must happen inside the tap, or iOS blocks it.
      openMessages(smsUrl(to, sentenceText(list.map((c) => spoken(c.word, c.form)))));
    } else {
      void saySentence(
        list.map((c) => spoken(c.word, c.form)),
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

  const decor = useMemo(() => {
    const art = DECOR[`${theme.mode}${portrait ? 'Portrait' : 'Landscape'}` as keyof typeof DECOR];
    return phone ? fitDecor(art, portrait ? 834 : 1194, portrait ? 1194 : 834, stageW, stageH) : art;
  }, [theme.mode, portrait, phone, stageW, stageH]);

  // ------------------------------------------------------------- pieces
  const parrotBlock = phone ? (
    <div style={{ position: 'relative', zIndex: 1, flex: 'none', width: portrait ? 54 : 50, display: 'flex', justifyContent: 'center', alignSelf: 'flex-end' }}>
      <Parrot pose={pose} name={settings.parrotName} motion={motion} width={portrait ? 54 : 48} height={portrait ? 59 : 52} />
    </div>
  ) : (
    <div style={{ position: 'relative', zIndex: 1, flex: 'none', width: 148, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: -40, position: 'relative', zIndex: 2 }}>
        <Parrot pose={pose} name={settings.parrotName} motion={motion} />
      </div>
      <div style={{ position: 'relative', width: 180, height: 66, marginTop: -6 }}>
        <ParrotLeaf fill={theme.leaf} vein={theme.leafVein} />
      </div>
    </div>
  );

  const roundButtons = (
    <>
      <RoundIconButton label="Son cümleler" theme={theme} compact={phone} onClick={() => setHistoryOpen((o) => !o)}>
        <History size={phone ? 20 : 22} strokeWidth={2.4} aria-hidden="true" />
      </RoundIconButton>
      <RoundIconButton label="Son kelimeyi sil" theme={theme} compact={phone} onClick={backspace}>
        <BackspaceIcon />
      </RoundIconButton>
      <RoundIconButton label="Hepsini temizle" theme={theme} compact={phone} onClick={clearAll}>
        <TrashIcon />
      </RoundIconButton>
    </>
  );

  const balloon = (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        minWidth: 0,
        height: phone ? (portrait ? 66 : 60) : portrait ? 114 : 120,
        marginBottom: phone ? 0 : portrait ? 18 : 30,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: phone ? 6 : 12,
        padding: phone ? '0 8px 0 12px' : '0 16px 0 22px',
        background: theme.surface,
        borderRadius: phone ? 24 : 42,
        boxShadow: `0 16px 32px ${theme.shadow(0.14)}, inset 0 -6px 0 ${theme.surfaceInset}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: phone ? -7 : -12,
          top: phone ? (portrait ? 26 : 23) : portrait ? 45 : 48,
          width: phone ? 15 : 26,
          height: phone ? 15 : 26,
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
          gap: phone ? 8 : 14,
          overflowX: 'auto',
          overflowY: 'visible',
          padding: '0 4px',
          margin: '0 -4px',
        }}
      >
        {chips.length === 0 && !sent && <EmptyHint theme={theme} compact={phone} />}
        {chips.length === 0 && sent && (
          <span
            className={motion ? 'kb-pop' : undefined}
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: phone ? 8 : 12,
              height: phone ? 48 : 64,
              padding: phone ? '0 18px 0 8px' : '0 28px 0 12px',
              borderRadius: phone ? 24 : 32,
              background: theme.gonder,
              boxShadow: `inset 0 -5px 0 ${theme.gonderInset}`,
              color: '#FFFFFF',
              fontSize: phone ? 19 : 26,
              fontWeight: 600,
              flex: 'none',
            }}
          >
            <span style={{ width: phone ? 32 : 42, height: phone ? 32 : 42, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={phone ? 20 : 28} strokeWidth={3.4} color={theme.gonder} aria-hidden="true" />
            </span>
            Gönderildi
          </span>
        )}
        {chips.map((c, i) => (
          <span role="listitem" key={c.uid} style={{ display: 'flex', flex: 'none' }}>
            <SentenceChip chip={c} theme={theme} orientation={orientation} reading={readingIdx === i} motion={motion} first={i === 0} compact={phone} />
          </span>
        ))}
      </div>
      {!(phone && portrait) && roundButtons}
    </div>
  );

  const okuBtn = (
    <ActionButton
      kind="oku"
      theme={theme}
      orientation={orientation}
      compact={phone ? (portrait ? { w: 82, h: 52 } : { w: 84, h: 60 }) : undefined}
      active={readingIdx !== null}
      disabled={!chips.length}
      onClick={() => void read()}
    />
  );
  const gonderBtn = (
    <ActionButton
      kind="gonder"
      theme={theme}
      orientation={orientation}
      compact={phone ? (portrait ? { w: 106, h: 52 } : { w: 108, h: 60 }) : undefined}
      launching={launching}
      disabled={!chips.length}
      onClick={send}
    />
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
        width: phone ? 30 : 40,
        height: phone ? 44 : 40,
        flex: 'none',
        padding: 0,
        border: 0,
        margin: 0,
        background: 'transparent',
        color: theme.gear,
        opacity: holding ? 1 : 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: phone ? 'relative' : 'absolute',
        top: phone ? undefined : 8,
        right: phone ? undefined : 12,
        zIndex: 3,
        cursor: 'pointer',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      <SettingsIcon size={20} strokeWidth={2.6} aria-hidden="true" />
      {holding && (
        <svg className="kb-hold" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" style={{ position: 'absolute', inset: 0, margin: 'auto' }}>
          <circle cx="20" cy="20" r="17" fill="none" stroke={theme.gear} strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray="100" />
        </svg>
      )}
    </button>
  );

  const header = phone ? (
    portrait ? (
      <div style={{ position: 'relative', zIndex: 1, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {parrotBlock}
          {balloon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {gear}
          {roundButtons}
          <span style={{ flex: 1 }} />
          {okuBtn}
          {gonderBtn}
        </div>
      </div>
    ) : (
      <div style={{ position: 'relative', zIndex: 1, flex: 'none', display: 'flex', alignItems: 'flex-end', gap: 8, padding: '6px 10px 0' }}>
        {parrotBlock}
        {balloon}
        {okuBtn}
        {gonderBtn}
        {gear}
      </div>
    )
  ) : portrait ? (
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
        gap: phone ? 6 : portrait ? 10 : 14,
        padding: phone ? (portrait ? '8px 8px 0' : '6px 10px 0') : portrait ? '8px 22px 0' : '0 30px',
      }}
    >
      {coreWords.map((w) => (
        <CoreTile
          key={w.id}
          word={w}
          theme={theme}
          orientation={orientation}
          compact={phone}
          ring={ringId === w.id}
          ringColor={tonesForWord(w).base}
          onTap={tap}
          onLongPress={longPressFor(w)}
        />
      ))}
    </div>
  );

  const gridStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: `repeat(${phone && portrait ? 3 : portrait ? 4 : 6}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${phone && portrait ? 4 : portrait ? 3 : 2}, minmax(0, 1fr))`,
    columnGap: phone ? 8 : 18,
    rowGap: phone ? 8 : portrait ? 18 : 20,
    padding: phone ? (portrait ? '10px 8px 10px' : '8px 10px 8px') : portrait ? '22px 30px 18px' : '22px 30px 20px',
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
              compact={phone}
              onTap={tap}
              onLongPress={longPressFor(w)}
            />
          ) : (
            <div key={`empty-${i}`} aria-hidden="true" />
          ),
        )}
      </section>
      <div style={{ position: 'relative', zIndex: 1, flex: 'none', display: 'flex', justifyContent: 'center', padding: phone ? '0 8px 8px' : '0 0 14px', minWidth: 0 }}>
        <CategoryNav
          compact={phone}
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

      {formsFor &&
        (() => {
          const { word, rect } = formsFor;
          const t = tonesForWord(word);
          const options = [word.say, ...wordForms(word)];
          const margin = phone ? 8 : 20;
          const width = Math.min(stageW - 2 * margin, 560);
          const left = Math.max(margin, Math.min(stageW - width - margin, rect.x + rect.w / 2 - width / 2));
          const above = rect.y > (phone ? stageH / 2 : 300);
          return (
            <>
              <div aria-hidden="true" onClick={() => setFormsFor(null)} style={{ position: 'absolute', inset: 0, zIndex: 22 }} />
              <div
                role="dialog"
                aria-label={`${word.label}: çekimler`}
                className={motion ? 'kb-pop' : undefined}
                style={{
                  position: 'absolute',
                  zIndex: 23,
                  left,
                  width,
                  boxSizing: 'border-box',
                  ...(above ? { bottom: stageH - rect.y + 12 } : { top: rect.y + rect.h + 12 }),
                  background: theme.surface,
                  borderRadius: 30,
                  boxShadow: `0 24px 48px ${theme.shadow(0.3)}, 0 0 0 4px ${t.base}, inset 0 -6px 0 ${theme.surfaceInset}`,
                  padding: '14px 14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
                  <span style={{ width: 44, height: 44, borderRadius: '50%', background: t.cardCircle, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: 'none' }}>
                    <WordPicture picture={word.picture} label={word.label} size={36} color={t.base} />
                  </span>
                  <span style={{ flex: 1, fontSize: 22, fontWeight: 700, color: theme.text }}>{word.label}</span>
                  <RoundIconButton label="Kapat" theme={theme} onClick={() => setFormsFor(null)}>
                    <X size={22} strokeWidth={2.6} aria-hidden="true" />
                  </RoundIconButton>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${phone ? 140 : 150}px, 1fr))`, gap: phone ? 8 : 10 }}>
                  {options.map((form, i) => (
                    <button
                      key={form + i}
                      type="button"
                      className="kb-press-small"
                      onClick={(e) => {
                        setFormsFor(null);
                        tap(word, e.currentTarget, i === 0 ? undefined : form);
                      }}
                      style={{
                        margin: 0,
                        border: 0,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        minHeight: 60,
                        padding: '0 14px',
                        borderRadius: 20,
                        background: i === 0 ? t.pill : theme.mode === 'day' ? theme.surfaceInset : theme.roundBtn,
                        boxShadow: `inset 0 -4px 0 ${i === 0 ? t.pillInset : theme.mode === 'day' ? '#F6DCCB' : theme.roundBtnInset}`,
                        fontSize: 24,
                        fontWeight: 600,
                        color: theme.text,
                      }}
                    >
                      {form}
                    </button>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

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
              top: phone ? (portrait ? 140 : 72) : portrait ? 214 : 196,
              left: phone ? 8 : portrait ? 22 : 190,
              right: phone ? 8 : portrait ? 22 : 318,
              maxHeight: phone ? stageH - (portrait ? 160 : 84) : portrait ? 560 : 440,
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
                  aria-label={`Tekrar söyle: ${ws.map((x) => x.form ?? x.word.say).join(' ')}`}
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
                  {ws.map(({ word: w, form }, j) => {
                    const t = tonesForWord(w);
                    return (
                      <span
                        key={j}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 48, padding: '0 14px 0 6px', borderRadius: 18, background: t.pill, flex: 'none' }}
                      >
                        <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <WordPicture picture={w.picture} label={w.label} size={32} color={t.base} />
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap' }}>{j === 0 ? upperFirstTr(form ?? w.say) : (form ?? w.say)}</span>
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

/** Card picture sizes on phones: the chosen size, made smaller when the
 *  screen is short so all 12 places fit without scrolling. */
const PHONE_CARD = { small: 64, medium: 80, large: 94 } as const;

function phoneCardSize(choice: keyof typeof PHONE_CARD, orientation: 'landscape' | 'portrait', stageH: number) {
  // Height left for one grid row once the header, core row and category bar are placed.
  const row = orientation === 'portrait' ? (stageH - 128 - 68 - 70 - 20 - 3 * 8) / 4 : (stageH - 66 - 66 - 72 - 16 - 8) / 2;
  const circle = Math.round(Math.max(40, Math.min(PHONE_CARD[choice], row - 38)));
  return { circle, img: Math.round(circle * 0.8) };
}

/** Lay the iPad background art out on a phone canvas: each piece keeps its
 *  relative position (by its centre) and is shrunk to the phone's width. */
function fitDecor(art: string, fromW: number, fromH: number, toW: number, toH: number): string {
  const sx = toW / fromW;
  const sy = toH / fromH;
  const ss = Math.min(sx, sy) * 1.15;
  return art.replace(
    /<svg ([^>]*?)width="([\d.]+)" height="([\d.]+)"([^>]*?)left: ([-\d.]+)px; top: ([-\d.]+)px;/g,
    (_m, a: string, w: string, h: string, b: string, l: string, t: string) => {
      const W = +w, H = +h, L = +l, T = +t;
      const nl = (L + W / 2) * sx - (W * ss) / 2;
      const nt = (T + H / 2) * sy - (H * ss) / 2;
      return `<svg ${a}width="${(W * ss).toFixed(1)}" height="${(H * ss).toFixed(1)}"${b}left: ${nl.toFixed(1)}px; top: ${nt.toFixed(1)}px;`;
    },
  );
}
