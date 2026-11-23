import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Camera,
  ChevronLeft,
  Download,
  GripVertical,
  Image as ImageIcon,
  Lock,
  LockOpen,
  MessageCircle,
  Mic,
  Play,
  Plus,
  Square,
  Trash2,
  Type,
  Upload,
  X,
  RotateCcw,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_BY_ID, LIBRARY, MAX_SLOTS_PER_CATEGORY, SLOTS_PER_CATEGORY, defaultSay, freeSlot, newWordId, searchLibrary, type CategoryId, type LibraryItem, type Picture, type Word } from '../lib/data';
import { BackupError, createBackup, parseBackup, restoreBackup, saveBackupFile, summarize } from '../lib/backup';
import { mix } from '../lib/color';
import { isValidAddress, openMessages, smsUrl } from '../lib/messages';
import { fetchBlob, prepareImage, searchArasaac, type ArasaacResult } from '../lib/pictures';
import { useRecorder, type Take } from '../lib/recorder';
import { onVoicesChanged, pickVoice, previewVoice, setSpeechRate, setVoicePack, turkishVoices } from '../lib/speech';
import { VOICE_PACKS, clipUrl } from '../lib/voice';
import { profileForCode } from '../lib/profile';
import {
  addWord,
  canUndoReset,
  getProfile,
  setProfile,
  deleteBlob,
  resetToOriginal,
  undoReset,
  moveWord,
  newBlobKey,
  removeWord,
  saveBlob,
  updateSettings,
  updateWord,
  useAppState,
  type CardSize,
  type SpeechRate,
  type TapGuard,
  type ThemeChoice,
} from '../lib/store';
import { formatDuration, lowerTr, voiceLabel } from '../lib/turkish';
import { Parrot } from './Parrot';
import { useStage } from './Stage';
import { WordPicture } from './WordPicture';

const FONT = "'Fredoka', system-ui, sans-serif";
const C = {
  bg: '#FFF4EC',
  text: '#3A2420',
  ink: '#2B3147',
  muted: '#8A5A4A',
  soft: '#FFF1E8',
  line: '#F3DCCB',
  orange: '#E8590C',
  orangeInset: '#C2470A',
};

const btn: CSSProperties = {
  margin: 0,
  padding: 0,
  border: 0,
  cursor: 'pointer',
  fontFamily: FONT,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

/** Family roles are common nouns ("Annenin sesi"); anything else is a name ("Dilan'ın sesi"). */
const FAMILY_ROLES = new Set(['Anne', 'Baba', 'Amca', 'Hala', 'Teyze', 'Dayı', 'Doktor', 'Dede', 'Nine', 'Babaanne', 'Anneanne', 'Abla', 'Ağabey', 'Abi', 'Kardeş', 'Öğretmen']);

type PictoResult = ArasaacResult & { library?: LibraryItem };

const fieldLabel: CSSProperties = { fontSize: 15, fontWeight: 700, color: C.muted };

function Card({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section
      style={{
        position: 'relative',
        background: '#FFFFFF',
        borderRadius: 30,
        boxShadow: '0 14px 30px rgba(200,100,60,0.12), inset 0 -5px 0 #FFF0E6',
        padding: '18px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: C.text }}>{title}</h2>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: 4, padding: 4, background: C.soft, borderRadius: 14 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              ...btn,
              flex: 1,
              height: 44,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 11,
              background: on ? '#FFFFFF' : 'transparent',
              boxShadow: on ? `0 2px 0 ${C.line}` : 'none',
              color: on ? C.ink : C.muted,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        ...btn,
        position: 'relative',
        width: 58,
        height: 34,
        flex: 'none',
        borderRadius: 17,
        background: on ? C.orange : '#E4DCE6',
        boxShadow: on ? `inset 0 -3px 0 ${C.orangeInset}` : 'inset 0 -3px 0 #D2C8D6',
        transition: 'background 150ms',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 27 : 3,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          transition: 'left 150ms',
        }}
      />
    </button>
  );
}

function CategoryChip({ id, on, onClick, small }: { id: CategoryId; on: boolean; onClick: () => void; small?: boolean }) {
  const c = CATEGORY_BY_ID[id];
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        ...btn,
        padding: '5px 11px 5px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 14,
        background: on ? mix(c.color, '#FFFFFF', 0.3) : small ? 'transparent' : C.soft,
        boxShadow: on && !small ? `0 0 0 3px ${c.color}` : 'none',
        fontSize: 14,
        fontWeight: 600,
        color: on || !small ? C.text : C.muted,
        whiteSpace: 'nowrap',
        flex: 'none',
        minHeight: 36,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          background: mix(c.color, '#FFFFFF', 0.35),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src={c.icon} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
      </span>
      {c.name}
    </button>
  );
}

function Waveform({ active, seconds }: { active: boolean; seconds: number }) {
  const heights = [8, 16, 26, 14, 30, 20, 10, 24, 32, 18, 12, 22, 6];
  const n = active ? heights.length : Math.max(3, Math.min(heights.length, Math.round(seconds * 6)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 32 }} aria-hidden="true">
      {heights.slice(0, n).map((h, i) => (
        <span
          key={i}
          className={active ? 'kb-wave' : undefined}
          style={{ width: 4, height: h, borderRadius: 2, background: C.orange, animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

/** Mic button + "Annenin sesi · 0:02". */
function Recorder({
  people,
  by,
  setBy,
  take,
  rec,
}: {
  people: { name: string; proper: boolean }[];
  by: number;
  setBy: (i: number) => void;
  take: Take | null;
  rec: ReturnType<typeof useRecorder>;
}) {
  const playRef = useRef<HTMLAudioElement | null>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 20, background: C.soft }}>
      <button
        type="button"
        aria-label={rec.recording ? 'Kaydı durdur' : 'Ses kaydet'}
        onClick={() => (rec.recording ? rec.stop() : void rec.start())}
        style={{
          ...btn,
          width: 48,
          height: 48,
          flex: 'none',
          borderRadius: '50%',
          background: C.orange,
          boxShadow: `inset 0 -4px 0 ${C.orangeInset}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
        }}
      >
        {rec.recording ? <Square size={18} fill="#FFFFFF" aria-hidden="true" /> : <Mic size={22} strokeWidth={2.4} aria-hidden="true" />}
      </button>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span className="kb-sr">Kimin sesi</span>
            <select
              value={by}
              onChange={(e) => setBy(Number(e.target.value))}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
                color: C.text,
                padding: 0,
                textDecoration: 'underline dotted',
                textUnderlineOffset: 3,
                cursor: 'pointer',
              }}
            >
              {people.map((p, i) => (
                <option key={p.name + i} value={i}>
                  {voiceLabel(p.name, p.proper)}
                </option>
              ))}
            </select>
          </label>
          <span>· {formatDuration(rec.recording ? rec.elapsed : take?.seconds ?? 0)}</span>
        </div>
        {rec.error ? (
          <div style={{ fontSize: 13, color: '#B3261E' }}>{rec.error}</div>
        ) : rec.recording || take ? (
          <Waveform active={rec.recording} seconds={take?.seconds ?? 0} />
        ) : (
          <div style={{ fontSize: 13, color: C.muted }}>
            İsterseniz kelimeyi kendi sesinizle kaydedin; yoksa cihazın sesi okur.
          </div>
        )}
      </div>
      {take && !rec.recording && (
        <>
          <button
            type="button"
            aria-label="Kaydı dinle"
            onClick={() => {
              playRef.current?.pause();
              playRef.current = new Audio(take.url);
              void playRef.current.play();
            }}
            style={{ ...btn, width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Play size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Kaydı sil"
            onClick={rec.clear}
            style={{ ...btn, width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ add a word

type PicMode = 'piktogram' | 'foto' | 'yazi';

function AddWord({ people }: { people: { name: string; proper: boolean }[] }) {
  const { words, settings } = useAppState();
  const places = settings.secondPage ? MAX_SLOTS_PER_CATEGORY : SLOTS_PER_CATEGORY;
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<PicMode>('piktogram');
  const [category, setCategory] = useState<CategoryId>(
    () => (['esyalar', 'kisiler', 'duygu', 'ekran', 'yerler', ...CATEGORIES.map((c) => c.id)] as CategoryId[]).find((id) => freeSlot(words, id, places) >= 0) ?? 'esyalar',
  );
  const [results, setResults] = useState<PictoResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'done' | 'offline'>('idle');
  const [chosen, setChosen] = useState<PictoResult | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [by, setBy] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rec = useRecorder();
  const fileRef = useRef<HTMLInputElement>(null);

  // As the word is typed: the app's own ready-made pictures first (offline),
  // then ARASAAC.
  useEffect(() => {
    if (mode !== 'piktogram' || !label.trim()) {
      setResults([]);
      setChosen(null);
      setSearchState('idle');
      return;
    }
    const lib: PictoResult[] = searchLibrary(label).map((item, i) => ({ id: -(i + 1), url: item.src, library: item }));
    setResults(lib);
    setChosen(lib[0] ?? null);
    if (lib[0] && freeSlot(words, lib[0].library!.category, places) >= 0) setCategory(lib[0].library!.category);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearchState('loading');
      try {
        const r = await searchArasaac(label, ctrl.signal);
        setResults([...lib, ...r]);
        setChosen((prev) => (prev?.library ? prev : (lib[0] ?? r[0] ?? null)));
        setSearchState('done');
      } catch {
        if (!ctrl.signal.aborted) setSearchState('offline');
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [label, mode]);

  const libItem = mode === 'piktogram' ? chosen?.library : undefined;
  const typed = label.trim();
  const finalLabel = libItem && lowerTr(libItem.label).startsWith(lowerTr(typed)) ? libItem.label : typed;
  const libCategoryFull = !!libItem && freeSlot(words, libItem.category, places) < 0;
  const slot = freeSlot(words, category, places);
  const full = slot < 0;
  const catName = CATEGORY_BY_ID[category].name;
  const cleanLabel = finalLabel;

  const previewPicture: Picture | null =
    mode === 'yazi' ? { kind: 'text' } : mode === 'foto' ? (photo ? { kind: 'builtin', src: photo.url } : null) : chosen ? { kind: 'builtin', src: chosen.url } : null;
  const canAdd = !!cleanLabel && !full && !busy && (mode === 'yazi' || !!previewPicture);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await prepareImage(file);
      setPhoto((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    } catch {
      setMessage('Bu fotoğraf açılamadı.');
    }
  };

  const submit = async () => {
    if (!canAdd) return;
    setBusy(true);
    setMessage(null);
    try {
      let picture: Picture = { kind: 'text' };
      if (mode === 'foto' && photo) {
        const key = newBlobKey('photo');
        await saveBlob(key, photo.blob);
        picture = { kind: 'stored', key, source: 'photo' };
      } else if (mode === 'piktogram' && chosen?.library) {
        picture = { kind: 'builtin', src: chosen.library.src };
      } else if (mode === 'piktogram' && chosen) {
        const key = newBlobKey('arasaac');
        await saveBlob(key, await fetchBlob(chosen.url));
        picture = { kind: 'stored', key, source: 'arasaac' };
      }
      let recording: Word['recording'];
      if (rec.take) {
        const key = newBlobKey('voice');
        await saveBlob(key, rec.take.blob);
        const p = people[by] ?? people[0];
        recording = { key, by: p.name, proper: p.proper, seconds: rec.take.seconds };
      }
      addWord({
        id: newWordId(cleanLabel),
        label: cleanLabel,
        say: defaultSay(cleanLabel, category),
        category,
        slot,
        hidden: false,
        picture,
        recording,
      });
      setMessage(`“${cleanLabel}” ${catName} tahtasına eklendi${slot >= SLOTS_PER_CATEGORY ? ' (2. sayfa)' : ''}.`);
      setLabel('');
      setChosen(null);
      setResults([]);
      setPhoto(null);
      rec.clear();
    } catch {
      setMessage('Eklenemedi. İnternet bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  const catTone = CATEGORY_BY_ID[category].color;

  return (
    <Card title="Kelime ekle">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="w-new" style={fieldLabel}>
          Kelime
        </label>
        <input
          id="w-new"
          type="text"
          value={label}
          autoComplete="off"
          placeholder="Örn. Lego"
          onChange={(e) => setLabel(e.target.value)}
          style={{
            height: 50,
            boxSizing: 'border-box',
            padding: '0 16px',
            border: `2px solid ${C.line}`,
            borderRadius: 14,
            fontFamily: FONT,
            fontSize: 20,
            fontWeight: 700,
            color: C.ink,
            background: '#FFFFFF',
            outlineColor: C.orange,
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Resim</span>
        <Segmented<PicMode>
          label="Resim türü"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'piktogram', label: 'Piktogram', icon: <ImageIcon size={18} aria-hidden="true" /> },
            { value: 'foto', label: 'Fotoğraf', icon: <Camera size={18} aria-hidden="true" /> },
            { value: 'yazi', label: 'Yazı', icon: <Type size={18} aria-hidden="true" /> },
          ]}
        />
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 108,
            height: 126,
            flex: 'none',
            boxSizing: 'border-box',
            padding: '10px 8px 12px',
            borderRadius: 36,
            background: '#FFFFFF',
            boxShadow: `0 12px 24px ${mix(catTone, '#FFFFFF', 0.16)}, inset 0 -6px 0 ${mix(catTone, '#FFFFFF', 0.14)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: mix(catTone, '#FFFFFF', 0.18),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {previewPicture && (
              <WordPicture
                picture={mode === 'foto' && photo ? { kind: 'builtin', src: photo.url } : previewPicture}
                label={cleanLabel || '?'}
                size={mode === 'foto' ? 70 : 56}
                color={catTone}
              />
            )}
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {cleanLabel || 'Kelime'}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
          {mode === 'piktogram' &&
            (results.some((r) => r.library) && (searchState !== 'done' || results.every((r) => r.library))
              ? `Sesim Var’ın hazır resmi bulundu.${libCategoryFull && libItem ? ` ${CATEGORY_BY_ID[libItem.category].name} dolu; başka bir kategori seçin${settings.secondPage ? '' : ' ya da Görünüm → İkinci sayfa’yı açın'}.` : ''}${searchState === 'offline' ? ' (İnternet yok; ARASAAC aranamadı.)' : ''}`
              : searchState === 'idle'
              ? 'Kelimeyi yazın; ARASAAC’ta uygun resimler aranır.'
              : searchState === 'loading'
                ? 'Aranıyor…'
                : searchState === 'offline'
                  ? 'İnternet yok. Fotoğraf çekin ya da yazı kullanın.'
                  : results.length
                    ? `ARASAAC’ta “${cleanLabel}” için ${results.length} sonuç. Birini seçin ya da kendi fotoğrafınızı çekin.`
                    : `ARASAAC’ta “${cleanLabel}” bulunamadı. Fotoğraf çekin ya da yazı kullanın.`)}
          {mode === 'foto' && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ ...btn, padding: '8px 14px', borderRadius: 12, background: C.soft, color: C.text, fontSize: 15, fontWeight: 600, display: 'inline-flex', gap: 8, alignItems: 'center' }}
              >
                <Camera size={18} aria-hidden="true" /> {photo ? 'Başka fotoğraf' : 'Fotoğraf çek / seç'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </>
          )}
          {mode === 'yazi' && 'Kartta resim yerine kelimenin ilk harfi görünür.'}
        </div>
      </div>
      {mode === 'piktogram' && (results.length > 1 || (results.length === 1 && searchState === 'done' && !results[0].library)) && (
        <div role="group" aria-label="ARASAAC sonuçları" style={{ display: 'flex', gap: 6 }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={chosen?.id === r.id}
              aria-label={`Resim ${r.id}`}
              onClick={() => {
                setChosen(r);
                if (r.library && freeSlot(words, r.library.category, places) >= 0) setCategory(r.library.category);
              }}
              style={{
                ...btn,
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#FFFFFF',
                boxShadow: chosen?.id === r.id ? `0 0 0 3px ${catTone}` : `0 0 0 2px ${C.line}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={r.url} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      )}
      {mode === 'piktogram' && !label.trim() && LIBRARY.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={fieldLabel}>Hazır resimler</span>
          <div className="kb-noscrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {LIBRARY.filter((item) => !words.some((w) => w.label === item.label))
              // The chosen category's pictures come first.
              .sort((a, b) => Number(b.category === category) - Number(a.category === category))
              .map((item) => (
              <button
                key={item.src}
                type="button"
                onClick={() => setLabel(item.label)}
                style={{
                  ...btn,
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px 6px 6px',
                  minHeight: 44,
                  borderRadius: 14,
                  background: C.soft,
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                <img src={item.src} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Kategori</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {CATEGORIES.map((c) => (
            <CategoryChip key={c.id} id={c.id} on={c.id === category} onClick={() => setCategory(c.id)} />
          ))}
        </div>
      </div>
      <Recorder people={people} by={by} setBy={setBy} take={rec.take} rec={rec} />
      {full && cleanLabel && (
        <div style={{ fontSize: 14, color: '#B3261E', fontWeight: 500 }}>
          {catName} tahtası dolu.{' '}
          {settings.secondPage
            ? 'Yer açmak için Kelimeler listesinden gizli bir kelimeyi silin.'
            : 'Görünüm → İkinci sayfa açılırsa 12 yer daha olur; ya da Kelimeler listesinden gizli bir kelimeyi silin.'}
        </div>
      )}
      {message && (
        <div role="status" style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>
          {message}
        </div>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canAdd}
        style={{
          ...btn,
          height: 56,
          borderRadius: 20,
          background: C.orange,
          opacity: canAdd ? 1 : 0.5,
          boxShadow: `0 10px 20px rgba(232,89,12,0.35), inset 0 -6px 0 ${C.orangeInset}`,
          color: '#FFFFFF',
          fontSize: 20,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flex: 'none',
        }}
      >
        <Plus size={24} strokeWidth={3} aria-hidden="true" />
        {busy ? 'Ekleniyor…' : 'Tahtaya ekle'}
      </button>
    </Card>
  );
}

// -------------------------------------------------------- word list

function WordRow({
  word,
  people,
  dragging,
  over,
  onGrip,
}: {
  word: Word;
  people: { name: string; proper: boolean }[];
  dragging: boolean;
  over: boolean;
  onGrip: (e: React.PointerEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [by, setBy] = useState(0);
  const rec = useRecorder();
  const catColor = word.category === 'core' ? '#7B61FF' : CATEGORY_BY_ID[word.category].color;
  const { settings } = useAppState();
  const voice = pickVoice(settings.voiceURI);

  const saveTake = async () => {
    if (!rec.take) return;
    const key = newBlobKey('voice');
    await saveBlob(key, rec.take.blob);
    if (word.recording) void deleteBlob(word.recording.key);
    const p = people[by] ?? people[0];
    updateWord(word.id, { recording: { key, by: p.name, proper: p.proper, seconds: rec.take.seconds } });
    rec.clear();
  };

  return (
    <div data-row={word.id} style={{ borderBottom: `2px solid ${C.soft}`, background: over ? C.soft : undefined, opacity: dragging ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 4px', opacity: word.hidden ? 0.55 : 1 }}>
        <span
          role="button"
          aria-label={`${word.label}: sürükleyerek yerini değiştir`}
          onPointerDown={onGrip}
          style={{ color: '#C9A898', display: 'flex', touchAction: 'none', cursor: 'grab', padding: '8px 0' }}
        >
          <GripVertical size={20} aria-hidden="true" />
        </span>
        <span
          style={{
            width: 46,
            height: 46,
            flex: 'none',
            borderRadius: 16,
            overflow: 'hidden',
            background: mix(catColor, '#FFFFFF', 0.25),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WordPicture picture={word.picture} label={word.label} size={38} color={catColor} />
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ ...btn, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, background: 'transparent', textAlign: 'left' }}
        >
          <span style={{ fontSize: 19, fontWeight: 600, color: C.text }}>{word.label}</span>
          {word.recording ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                alignSelf: 'flex-start',
                padding: '3px 8px',
                borderRadius: 8,
                background: '#FFE9DC',
                color: C.orange,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Mic size={13} aria-hidden="true" />
              {voiceLabel(word.recording.by, word.recording.proper)}
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{clipUrl(settings.voicePack, word.say) ? `${VOICE_PACKS.find((p) => p.id === settings.voicePack)?.name.split(' ')[0] ?? 'Hazır ses'} okur` : voice ? `${voice.name.split(' ')[0]} okur` : 'Cihaz sesi okur'}</span>
          )}
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.muted, width: 74, textAlign: 'right' }}>{word.hidden ? 'Gizli' : 'Görünüyor'}</span>
        <Toggle on={!word.hidden} onChange={(v) => updateWord(word.id, { hidden: !v })} label={`${word.label} görünsün`} />
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 4px 12px 36px' }}>
          <Recorder people={people} by={by} setBy={setBy} take={rec.take} rec={rec} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rec.take && (
              <button type="button" onClick={() => void saveTake()} style={{ ...btn, padding: '8px 14px', borderRadius: 12, background: C.orange, color: '#FFFFFF', fontSize: 15, fontWeight: 600 }}>
                Kaydı kullan
              </button>
            )}
            {word.recording && (
              <button
                type="button"
                onClick={() => {
                  void deleteBlob(word.recording!.key);
                  updateWord(word.id, { recording: undefined });
                }}
                style={{ ...btn, padding: '8px 14px', borderRadius: 12, background: C.soft, color: C.text, fontSize: 15, fontWeight: 600 }}
              >
                Aile kaydını kaldır
              </button>
            )}
            {word.id.startsWith('w-') && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`“${word.label}” silinsin mi?`)) removeWord(word.id);
                }}
                style={{ ...btn, padding: '8px 14px', borderRadius: 12, background: C.soft, color: '#B3261E', fontSize: 15, fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}
              >
                <Trash2 size={16} aria-hidden="true" /> Kelimeyi sil
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WordList({ people }: { people: { name: string; proper: boolean }[] }) {
  const { words, settings } = useAppState();
  const [cat, setCat] = useState<CategoryId>('kisiler');
  const list = useMemo(() => words.filter((w) => w.category === cat).sort((a, b) => a.slot - b.slot), [words, cat]);
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);

  // Drag a row by its grip onto another row to swap their places.
  const onGrip = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDrag({ id, over: null });
    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-row]');
      const over = el?.getAttribute('data-row') ?? null;
      setDrag((d) => (d ? { ...d, over } : d));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-row]');
      const target = words.find((w) => w.id === el?.getAttribute('data-row'));
      if (target && target.id !== id) moveWord(id, target.slot);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <Card title="Kelimeler" style={{ flex: 1, minHeight: 0 }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
        Tahta küçük başlar, birlikte büyür. Gizlenen kelimenin yeri boş kalır; diğer kartlar asla kaymaz.
      </p>
      <div className="kb-noscrollbar" style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 'none' }}>
        {CATEGORIES.map((c) => (
          <CategoryChip key={c.id} id={c.id} on={c.id === cat} small onClick={() => setCat(c.id)} />
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 -6px', padding: '0 6px' }}>
        {list.length === 0 && <p style={{ color: C.muted, fontSize: 15 }}>Bu kategoride henüz kelime yok. Soldan ekleyebilirsiniz.</p>}
        {list.map((w, i) => (
          <div key={w.id}>
            {w.slot >= SLOTS_PER_CATEGORY && (i === 0 || list[i - 1].slot < SLOTS_PER_CATEGORY) && (
              <div style={{ padding: '12px 4px 4px', fontSize: 14, fontWeight: 700, color: C.muted }}>
                2. sayfa{!settings.secondPage && ' · İkinci sayfa kapalı, bu kelimeler tahtada görünmez'}
              </div>
            )}
            <WordRow word={w} people={people} dragging={drag?.id === w.id} over={!!drag && drag.over === w.id && drag.id !== w.id} onGrip={onGrip(w.id)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------- always-visible row

function CoreRowEditor() {
  const { words, settings } = useAppState();
  const [editing, setEditing] = useState<number | null>(null);
  const core = settings.core.map((id) => words.find((w) => w.id === id));
  return (
    <Card title="Hep görünen satır">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        {core.map((w, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}. kutu: ${w?.label ?? 'boş'}. Değiştirmek için dokun`}
            aria-pressed={editing === i}
            onClick={() => setEditing(editing === i ? null : i)}
            style={{
              ...btn,
              height: 62,
              borderRadius: 16,
              background: C.soft,
              boxShadow: editing === i ? `0 0 0 3px ${C.orange}` : `inset 0 -3px 0 ${C.line}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minWidth: 0,
            }}
          >
            {w && <WordPicture picture={w.picture} label={w.label} size={30} />}
            <span style={{ fontSize: 11, fontWeight: 600, color: C.text, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {w?.label ?? '—'}
            </span>
          </button>
        ))}
      </div>
      {editing === null ? (
        <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
          Her kategoride aynı yerde durur. Değiştirmek için bir kutuya dokunun.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{editing + 1}. kutuya gelecek kelimeyi seçin:</div>
          <div className="kb-noscrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {words
              .filter((w) => !settings.core.includes(w.id))
              .map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    const next = [...settings.core];
                    next[editing] = w.id;
                    updateSettings({ core: next });
                    setEditing(null);
                  }}
                  style={{ ...btn, flex: 'none', padding: '6px 10px 6px 6px', borderRadius: 12, background: C.soft, display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600, color: C.text }}
                >
                  <WordPicture picture={w.picture} label={w.label} size={24} />
                  {w.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------- appearance + voice

function Appearance() {
  const { settings } = useAppState();
  return (
    <Card title="Görünüm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Düğme boyutu</span>
        <Segmented<CardSize>
          label="Düğme boyutu"
          value={settings.size}
          onChange={(size) => updateSettings({ size })}
          options={[
            { value: 'small', label: 'Küçük' },
            { value: 'medium', label: 'Orta' },
            { value: 'large', label: 'Büyük' },
          ]}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Gündüz / gece</span>
        <Segmented<ThemeChoice>
          label="Gündüz / gece"
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={[
            { value: 'auto', label: 'Otomatik' },
            { value: 'day', label: 'Gündüz' },
            { value: 'night', label: 'Gece' },
          ]}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Yanlışlıkla dokunma koruması</span>
        <Segmented<'0' | '500' | '1000'>
          label="Yanlışlıkla dokunma koruması"
          value={String(settings.tapGuardMs) as '0' | '500' | '1000'}
          onChange={(v) => updateSettings({ tapGuardMs: Number(v) as TapGuard })}
          options={[
            { value: '0', label: 'Kapalı' },
            { value: '500', label: 'Yarım sn' },
            { value: '1000', label: '1 sn' },
          ]}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>Bir karta dokunduktan sonra bu süre içindeki dokunuşlar yok sayılır. Eli titreyenler için.</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Kelime çekimleri</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>Karta basılı tutunca: kolum, suya, annem, geliyorum, gelme…</div>
        </div>
        <Toggle on={!!settings.wordForms} onChange={(wordForms) => updateSettings({ wordForms })} label="Kelime çekimleri" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>İkinci sayfa</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
            Her kategoriye 12 yer daha. Tahtada aşağı kaydırınca (ya da seçili kategoriye bir daha dokununca) 2. sayfa görünür. İlk sayfa hiç değişmez.
          </div>
        </div>
        <Toggle on={!!settings.secondPage} onChange={(secondPage) => updateSettings({ secondPage })} label="İkinci sayfa" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Hareket ve animasyon</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>Kapalıyken sakin mod</div>
        </div>
        <Toggle on={settings.motion} onChange={(motion) => updateSettings({ motion })} label="Hareket ve animasyon" />
      </div>
    </Card>
  );
}

function VoiceAndParrot() {
  const { settings } = useAppState();
  const [voices, setVoices] = useState(turkishVoices);
  useEffect(() => onVoicesChanged(() => setVoices(turkishVoices())), []);
  const current = pickVoice(settings.voiceURI);
  return (
    <Card title="Ses ve papağan">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Okuyan ses</div>
          <label style={{ display: 'block' }}>
            <span className="kb-sr">Okuyan ses</span>
            <select
              value={settings.voicePack ? `pack:${settings.voicePack}` : (current?.voiceURI ?? '')}
              onChange={(e) => {
                const v = e.target.value;
                const voicePack = v.startsWith('pack:') ? v.slice(5) : null;
                updateSettings(voicePack ? { voicePack } : { voicePack: null, voiceURI: v || null });
                setVoicePack(voicePack);
                previewVoice(voicePack ? settings.voiceURI : v || null, settings.parrotName);
              }}
              style={{ maxWidth: '100%', border: 0, background: 'transparent', padding: 0, fontFamily: FONT, fontSize: 13, fontWeight: 500, color: C.muted }}
            >
              {VOICE_PACKS.map((p) => (
                <option key={p.id} value={`pack:${p.id}`}>
                  {p.name} · aile kayıtları önce
                </option>
              ))}
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · cihaz sesi · aile kayıtları önce
                </option>
              ))}
            </select>
          </label>
          {settings.voicePack && (
            <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginTop: 2 }}>
              Ailenin yazdığı yeni kelimeleri {current ? current.name : 'cihaz sesi'} okur.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => previewVoice(settings.voiceURI, settings.parrotName)}
          style={{ ...btn, height: 42, padding: '0 16px', borderRadius: 14, background: C.soft, color: C.text, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Play size={16} aria-hidden="true" /> Dinle
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={fieldLabel}>Konuşma hızı</span>
        <Segmented<SpeechRate>
          label="Konuşma hızı"
          value={settings.speechRate}
          onChange={(speechRate) => {
            updateSettings({ speechRate });
            setSpeechRate(speechRate);
            previewVoice(settings.voiceURI, settings.parrotName);
          }}
          options={[
            { value: 'slow', label: 'Yavaş' },
            { value: 'normal', label: 'Normal' },
            { value: 'fast', label: 'Hızlı' },
          ]}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="parrot-name" style={fieldLabel}>
            Papağanın adı
          </label>
          <input
            id="parrot-name"
            type="text"
            value={settings.parrotName}
            onChange={(e) => updateSettings({ parrotName: e.target.value })}
            onBlur={(e) => !e.target.value.trim() && updateSettings({ parrotName: 'Pırpır' })}
            style={{
              height: 50,
              boxSizing: 'border-box',
              padding: '0 16px',
              border: `2px solid ${C.line}`,
              borderRadius: 14,
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 600,
              color: C.ink,
              outlineColor: C.orange,
              width: '100%',
            }}
          />
        </div>
        <div style={{ width: 56, flex: 'none', marginBottom: -4 }}>
          <Parrot pose="cheeky" name={settings.parrotName} motion={false} width={56} height={62} />
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------- Gönder → Messages

function SendSetup() {
  const { settings } = useAppState();
  const sendTo = settings.sendTo ?? { name: '', address: '' };
  const [address, setAddress] = useState(sendTo.address);
  const [name, setName] = useState(sendTo.name);
  const valid = isValidAddress(address);
  const empty = !address.trim();
  const save = (patch: Partial<{ name: string; address: string }>) => updateSettings({ sendTo: { ...sendTo, name, address, ...patch } });
  const input: CSSProperties = {
    height: 50,
    boxSizing: 'border-box',
    padding: '0 16px',
    border: `2px solid ${C.line}`,
    borderRadius: 14,
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 600,
    color: C.ink,
    outlineColor: C.orange,
    width: '100%',
  };
  return (
    <Card title="Gönder → Mesajlar">
      <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
        Gönder’e basınca Mesajlar açılır; cümle yazılmış ve size adreslenmiş olarak gelir. Göndermek için Mesajlar’daki oka bir kez dokunmak yeterli. Boş
        bırakırsanız Gönder cümleyi sadece sesli söyler.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="send-name" style={fieldLabel}>
          Kime? (isim)
        </label>
        <input id="send-name" type="text" value={name} placeholder="Örn. Anne" onChange={(e) => setName(e.target.value)} onBlur={() => save({ name: name.trim() })} style={input} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="send-address" style={fieldLabel}>
          Telefon numarası ya da iMessage adresi
        </label>
        <input
          id="send-address"
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="off"
          value={address}
          placeholder="+90 5xx xxx xx xx"
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => save({ address: address.trim() })}
          style={{ ...input, borderColor: !empty && !valid ? '#E5484D' : C.line }}
        />
        {!empty && !valid && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#B3261E' }}>Bu bir telefon numarasına ya da e-posta adresine benzemiyor.</span>
        )}
      </div>
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          save({ address: address.trim(), name: name.trim() });
          openMessages(smsUrl(address, `Merhaba! Bu, Sesim Var’dan bir deneme mesajı.`));
        }}
        style={{
          ...btn,
          height: 46,
          borderRadius: 14,
          background: C.soft,
          color: C.text,
          boxShadow: `inset 0 -4px 0 ${C.line}`,
          fontSize: 16,
          fontWeight: 600,
          opacity: valid ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <MessageCircle size={18} strokeWidth={2.6} aria-hidden="true" />
        Deneme mesajı aç
      </button>
    </Card>
  );
}

// ------------------------------------------------------------------ backup

function Backup() {
  const { settings } = useAppState();
  const [busy, setBusy] = useState<'save' | 'restore' | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [undoable, setUndoable] = useState(canUndoReset);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setBusy('save');
    setMessage(null);
    try {
      const { file, missing } = await createBackup();
      const how = await saveBackupFile(file);
      const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      if (how === 'cancelled') setMessage({ text: 'Yedekleme iptal edildi.' });
      else
        setMessage({
          text:
            (how === 'shared' ? `Yedek hazır (${size}). Dosyalar'a veya iCloud Drive'a kaydettiyseniz tamam.` : `Yedek indirildi: ${file.name} (${size}).`) +
            (missing ? ` ${missing} dosya bulunamadı ve yedeğe girmedi.` : ''),
        });
    } catch {
      setMessage({ text: 'Yedek oluşturulamadı. Tekrar deneyin.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    setBusy('restore');
    setMessage(null);
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      const { words, recordings, createdAt } = summarize(backup);
      const when = new Date(createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!confirm(`${when} tarihli yedek yüklensin mi?\n\n${words} kelime, ${recordings} ses kaydı.\nBu iPad'deki şimdiki tahta yedektekiyle değiştirilecek.`)) {
        setMessage({ text: 'Geri yükleme iptal edildi.' });
        return;
      }
      await restoreBackup(backup);
      setMessage({ text: `Yedek geri yüklendi: ${words} kelime, ${recordings} ses kaydı.` });
    } catch (e) {
      setMessage({ text: e instanceof BackupError ? e.message : 'Dosya okunamadı. Doğru yedek dosyasını seçtiğinizden emin olun.', error: true });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const action: CSSProperties = {
    ...btn,
    flex: 1,
    height: 48,
    borderRadius: 16,
    fontSize: 17,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  return (
    <Card title="Yedek">
      <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
        Kelimeler, ayarlar, ses kayıtları ve fotoğraflar tek bir dosyaya kaydedilir. Dosyayı Dosyalar'da veya iCloud Drive'da saklayın; iPad değişirse ya da
        uygulama silinirse buradan geri yükleyin.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!!busy}
          style={{ ...action, background: C.orange, color: '#FFFFFF', boxShadow: `inset 0 -5px 0 ${C.orangeInset}`, opacity: busy ? 0.6 : 1 }}
        >
          <Download size={20} strokeWidth={2.6} aria-hidden="true" />
          {busy === 'save' ? 'Hazırlanıyor…' : 'Yedekle'}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
          style={{ ...action, background: C.soft, color: C.text, boxShadow: `inset 0 -4px 0 ${C.line}`, opacity: busy ? 0.6 : 1 }}
        >
          <Upload size={20} strokeWidth={2.6} aria-hidden="true" />
          {busy === 'restore' ? 'Yükleniyor…' : 'Geri yükle'}
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void restore(e.target.files?.[0])} />
      </div>
      {message && (
        <div role="status" style={{ fontSize: 14, fontWeight: 600, color: message.error ? '#B3261E' : C.muted, lineHeight: 1.4 }}>
          {message.text}
        </div>
      )}
      <div style={{ borderTop: `2px solid ${C.soft}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Kullanım sayısını paylaş</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
            Sesim Var’ın kaç cihazda ve ne kadar kullanıldığını sayar: rastgele bir cihaz numarası, gün, dokunma ve cümle sayısı. İnternet yokken de sayar, sonra
            gönderir. Söylenen kelimeler, cümleler, isimler ve kayıtlar asla gönderilmez.
          </div>
        </div>
        <Toggle on={settings.shareUsage !== false} onChange={(shareUsage) => updateSettings({ shareUsage })} label="Kullanım sayısını paylaş" />
      </div>
      <div style={{ borderTop: `2px solid ${C.soft}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!confirmReset ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setConfirmReset(true);
                setMessage(null);
              }}
              style={{ ...action, background: 'transparent', color: '#B3261E', boxShadow: `inset 0 0 0 2px #F3C9C4` }}
            >
              <RotateCcw size={18} strokeWidth={2.6} aria-hidden="true" /> İlk haline döndür
            </button>
            {undoable && (
              <button
                type="button"
                onClick={() => {
                  if (undoReset()) setMessage({ text: 'Tahta sıfırlamadan önceki haline geri getirildi.' });
                  setUndoable(false);
                }}
                style={{ ...action, background: C.soft, color: C.text, boxShadow: `inset 0 -4px 0 ${C.line}` }}
              >
                Geri al
              </button>
            )}
          </div>
        ) : (
          <div role="alertdialog" aria-label="İlk haline döndürülsün mü?" style={{ background: '#FDECEA', borderRadius: 18, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#8C1D18', lineHeight: 1.4 }}>
              Tahta, uygulamanın ilk açıldığı gibi olur: eklediğiniz kelimeler, değiştirdiğiniz yerler ve tüm ayarlar (Gönder adresi dahil) başa döner.
              Hemen ardından “Geri al” ile eski haline getirebilirsiniz; yine de önce Yedekle’ye basmanız iyi olur.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setConfirmReset(false)} style={{ ...action, background: '#FFFFFF', color: C.text, boxShadow: `inset 0 -4px 0 ${C.line}` }}>
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToOriginal();
                  setConfirmReset(false);
                  setUndoable(true);
                  setMessage({ text: 'Tahta ilk haline döndü. Fikrinizi değiştirirseniz “Geri al”a basın.' });
                }}
                style={{ ...action, background: '#B3261E', color: '#FFFFFF', boxShadow: 'inset 0 -5px 0 #8C1D18' }}
              >
                Evet, sıfırla
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ family board

/** Zeki's board has the family's own names and places; everyone else gets
 *  the general board. Opening sesimvar.d3asoft.com/zeki or typing the code
 *  here switches this device. */
function FamilyBoard() {
  useAppState(); // re-render when the board changes
  const profile = getProfile();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const open = () => {
    const p = profileForCode(code);
    if (!p) {
      setMessage({ text: 'Bu kod bulunamadı.', error: true });
      return;
    }
    setProfile(p);
    setCode('');
    setMessage({ text: 'Zeki’nin tahtası açıldı: aile isimleri ve yerleri yerlerinde.' });
  };
  return (
    <Card title="Aile tahtası">
      {profile === 'zeki' ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
            Bu cihazda <b>Zeki’nin tahtası</b> açık: Dilan, Barış, Güler Teyze, Elazığ gibi aile kelimeleri görünür.
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>Başka cihazlarda açmak için: sesimvar.d3asoft.com/zeki</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, lineHeight: 1.4 }}>
            Herkes genel tahtayı görür. Ailenin kendi tahtası için aile kodunu yazın (ya da sesimvar.d3asoft.com/kod adresini açın).
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ flex: 1, minWidth: 0 }}>
              <span className="kb-sr">Aile kodu</span>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open();
                }}
                placeholder="Aile kodu"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 16, border: `2px solid ${C.line}`, padding: '0 14px', fontFamily: FONT, fontSize: 17, color: C.text, background: '#FFFFFF' }}
              />
            </label>
            <button
              type="button"
              onClick={open}
              disabled={!code.trim()}
              style={{ ...btn, height: 48, padding: '0 20px', borderRadius: 16, background: C.orange, color: '#FFFFFF', fontSize: 17, fontWeight: 600, boxShadow: `inset 0 -5px 0 ${C.orangeInset}`, opacity: code.trim() ? 1 : 0.5 }}
            >
              Aç
            </button>
          </div>
        </>
      )}
      {message && (
        <div role="status" style={{ fontSize: 14, fontWeight: 600, color: message.error ? '#B3261E' : C.muted }}>
          {message.text}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- screen

export function Settings({ onClose }: { onClose: () => void }) {
  const { words, settings } = useAppState();
  const { orientation, phone } = useStage();
  const portrait = orientation === 'portrait';
  const people = useMemo(() => {
    const fam = words.filter((w) => w.category === 'kisiler').map((w) => ({ name: w.label, proper: !FAMILY_ROLES.has(w.label) }));
    return fam.length ? fam : [{ name: 'Aile', proper: false }];
  }, [words]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
        fontFamily: FONT,
        color: C.text,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, flex: 'none', display: 'flex', alignItems: 'center', gap: phone ? 10 : 18, padding: phone ? '10px 10px 4px' : '22px 28px 4px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...btn,
            height: 50,
            padding: '0 18px 0 12px',
            borderRadius: 18,
            background: C.orange,
            boxShadow: `0 10px 20px rgba(232,89,12,0.35), inset 0 -5px 0 ${C.orangeInset}`,
            color: '#FFFFFF',
            fontSize: 19,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronLeft size={24} strokeWidth={3} aria-hidden="true" /> Bitti
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: phone ? 24 : 30, fontWeight: 600, lineHeight: 1.1 }}>Ayarlar</h1>
          <div style={{ fontSize: phone ? 12 : 14, fontWeight: 500, color: C.muted, lineHeight: 1.25 }}>
            Aile için · ana ekrandaki çarka {settings.locked ? '2 saniye basılı tutarak' : 'dokunarak'} açılır
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.locked}
          onClick={() => updateSettings({ locked: !settings.locked })}
          style={{
            ...btn,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 16,
            background: '#FFFFFF',
            boxShadow: '0 14px 30px rgba(200,100,60,0.12), inset 0 -5px 0 #FFF0E6',
            color: C.muted,
            fontSize: 14,
            fontWeight: 600,
            minHeight: 44,
          }}
        >
          {settings.locked ? <Lock size={18} aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}
          {settings.locked ? 'Kilitli' : 'Kilit açık'}
        </button>
      </div>

      {phone ? (
        // Phones: the cards in one scrolling page (two columns when sideways).
        <div
          className="kb-noscrollbar"
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: portrait ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)',
            alignItems: 'start',
            gap: 12,
            padding: '10px 10px 24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <AddWord people={people} />
            {portrait && (
              <div style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
                <WordList people={people} />
              </div>
            )}
            <CoreRowEditor />
            <Appearance />
            {portrait && <VoiceAndParrot />}
            <SendSetup />
            {portrait && <Backup />}
            {portrait && <FamilyBoard />}
          </div>
          {!portrait && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              <div style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
                <WordList people={people} />
              </div>
              <VoiceAndParrot />
              <Backup />
              <FamilyBoard />
            </div>
          )}
        </div>
      ) : (
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: portrait ? 'minmax(0, 1fr) minmax(0, 1fr)' : '360px minmax(0, 1fr) 360px',
          gap: 18,
          padding: '14px 28px 10px',
          overflowY: portrait ? 'auto' : 'hidden',
        }}
      >
        <div className="kb-noscrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
          <AddWord people={people} />
          {portrait && (
            <>
              <CoreRowEditor />
              <SendSetup />
              <Backup />
              <FamilyBoard />
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 18 }}>
          <WordList people={people} />
          {portrait && (
            <>
              <Appearance />
              <VoiceAndParrot />
            </>
          )}
        </div>
        {!portrait && (
          <div className="kb-noscrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
            <CoreRowEditor />
            <Appearance />
            <VoiceAndParrot />
            <SendSetup />
            <Backup />
            <FamilyBoard />
          </div>
        )}
      </div>
      )}
      <div style={{ flex: 'none', padding: phone ? '0 10px 8px' : '0 28px 14px', fontSize: phone ? 11 : 13, fontWeight: 500, color: C.muted }}>
        Piktogramlar: Sergio Palao, ARASAAC (arasaac.org), CC BY-NC-SA · Reklam yok, hesap yok; kelimeler, cümleler ve kayıtlar bu cihazda kalır.
      </div>
    </div>
  );
}
