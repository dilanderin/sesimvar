import { lowerTr } from './turkish';

export type CategoryId = 'temel' | 'kisiler' | 'eylem' | 'gunluk' | 'vucut' | 'duygu' | 'ekran' | 'esyalar' | 'yerler';

export interface Category {
  id: CategoryId;
  name: string;
  color: string;
  icon: string;
}

/** The nine categories, in tab-bar order, with the base colours from the design. */
export const CATEGORIES: Category[] = [
  { id: 'temel', name: 'Temel', color: '#7B61FF', icon: 'pictos/v2/evet.png' },
  { id: 'kisiler', name: 'Kişiler', color: '#FF9600', icon: 'pictos/v2/kisiler.png' },
  { id: 'eylem', name: 'Eylem', color: '#A9713F', icon: 'pictos/v2/gel.png' },
  { id: 'gunluk', name: 'Günlük', color: '#00B4C4', icon: 'pictos/v2/yemek.png' },
  { id: 'vucut', name: 'Vücut', color: '#FF4B6E', icon: 'pictos/v2/kol.png' },
  { id: 'duygu', name: 'Duygu', color: '#F2B100', icon: 'pictos/v2/mutlu.png' },
  { id: 'ekran', name: 'Ekran', color: '#1C9BF6', icon: 'pictos/v2/ekran.png' },
  { id: 'esyalar', name: 'Eşyalar', color: '#2BC866', icon: 'pictos/v2/tablet.png' },
  { id: 'yerler', name: 'Yerler', color: '#C05BF0', icon: 'pictos/v2/eve.png' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

/** Each category board has a fixed number of places. A hidden word keeps its
 *  place empty, so the other cards never move. */
/** Places on a category's first page. */
export const SLOTS_PER_CATEGORY = 12;
/** Places with the optional second page (Ayarlar → Görünüm → İkinci sayfa). */
export const MAX_SLOTS_PER_CATEGORY = 24;

export type Picture =
  | { kind: 'builtin'; src: string }
  | { kind: 'stored'; key: string; source: 'arasaac' | 'photo' }
  | { kind: 'text' };

export interface Recording {
  key: string;
  /** Who recorded it, e.g. "Anne" → shown as "Annenin sesi". */
  by: string;
  proper: boolean;
  seconds: number;
}

export interface Word {
  id: string;
  label: string;
  /** How the word appears and is spoken inside the sentence (e.g. "su" for "Su"). */
  say: string;
  category: CategoryId | 'core';
  slot: number;
  hidden: boolean;
  picture: Picture;
  recording?: Recording;
}

/** Whose board: "genel" for everyone, "zeki" for the family's own board
 *  (sesimvar.d3asoft.com/zeki, or Ayarlar → Aile kodu). */
export type Profile = 'genel' | 'zeki';

type Seed = [
  label: string,
  picto: string | null,
  opts?: { say?: string; hidden?: boolean; keepCase?: boolean; only?: Profile; slot?: number },
];

const SEEDS: Record<CategoryId | 'core', Seed[]> = {
  core: [
    ['Evet', 'evet.svg'],
    ['Hayır', 'hayir.svg'],
    ['İstiyorum', 'istiyorum.svg'],
    ['Yok', 'yok.svg'],
    ['Bitti', 'bitti.svg'],
    ['Daha', 'daha.svg'],
  ],
  temel: [
    ['Oldu', 'oldu.png'],
    ['Var', 'var.png'],
    ['İstemiyorum', 'istemiyorum.png'],
    ['Yardım', 'yardim.png'],
    ['Tamam', 'tamam.png'],
    ['Bilmiyorum', 'bilmiyorum.png'],
    ['Ben', 'ben.png'],
    ['Ne', 'ne.png'],
    ['Nerede', 'nerede.png'],
    ['Kim', 'kim.png'],
    ['Şimdi', 'simdi.png'],
    ['Sonra', 'sonra.png'],
  ],
  kisiler: [
    ['Anne', 'anne.svg', { keepCase: true }],
    ['Baba', 'baba.svg', { keepCase: true }],
    ['Amca', 'amca.svg', { keepCase: true }],
    ['Hala', 'hala.svg', { keepCase: true }],
    // The family's own people are only on Zeki's board.
    ['Dilan', 'dilan.svg', { keepCase: true, only: 'zeki' }],
    ['Güler Teyze', 'teyze.svg', { keepCase: true, only: 'zeki' }],
    ['Dayı', 'dayi.svg', { keepCase: true }],
    ['Doktor', 'doktor.png', { keepCase: true, hidden: true }],
    ['Barış', 'baris.svg', { keepCase: true, only: 'zeki' }],
    ['Teyze', 'teyze.svg', { keepCase: true, only: 'genel', slot: 5 }],
  ],
  eylem: [
    ['Gel', 'gel.svg'],
    ['Git', 'git.svg'],
    ['Al', 'al.svg'],
    ['Ver', 'ver.svg'],
    ['Getir', 'getir.svg'],
    ['Bak', 'bak.svg'],
    ['Oyna', 'oyna.svg'],
    ['İzle', 'izle.svg'],
    ['Ara', 'ara.svg'],
    ['Bekle', 'bekle.svg'],
    ['Yap', 'yap.svg'],
    ['Gönder', 'gonder.svg'],
  ],
  gunluk: [
    ['Su', 'su.png'],
    ['Yemek', 'yemek.png'],
    ['Acıktım', 'aciktim.png'],
    ['Susadım', 'susadim.png'],
    ['Çay', 'cay.png'],
    ['Ekmek', 'ekmek.png'],
    ['Tuvalet', 'tuvalet.png'],
    ['Banyo', 'banyo.png'],
    ['Uyku', 'uyku.png'],
    ['Yoruldum', 'yoruldum.png'],
    ['Üşüdüm', 'usudum.png'],
    ['Sıcak', 'sicak.png'],
  ],
  vucut: [
    ['Kol', 'kol.svg'],
    ['Bacak', 'bacak.svg'],
    ['Acıyor', 'aciyor.svg'],
    ['Kaşınıyor', 'kasiniyor.svg'],
    ['Kızardı', 'kizardi.svg'],
    ['Düştü', 'dustu.svg'],
    ['Kırıldı', 'kirildi.svg'],
    ['Hasta', 'hasta.svg'],
    ['Baş', 'bas.svg'],
    ['Karın', 'karin.svg'],
    ['Diş', 'dis.svg'],
    ['İlaç', 'ilac.svg'],
  ],
  // The design shows no words for Duygu yet: the board starts small and the
  // family adds words from Ayarlar.
  duygu: [['Mutlu', 'mutlu.png']],
  ekran: [
    ['Minecraft', 'minecraft.svg', { keepCase: true }],
    ['İzle', 'izle.svg'],
    ['Oyna', 'oyna.svg'],
    // From the first version's Ekran board.
    ['Oyun', 'oyun.png'],
    ['YouTube', 'youtube.png', { keepCase: true }],
    ['Netflix', 'netflix.png', { keepCase: true }],
    ['Film', 'film.png'],
    ['Dizi', 'dizi.png'],
    ['Çizgi film', 'cizgi-film.png'],
    ['Haberler', 'haberler.png'],
  ],
  esyalar: [
    ['Tablet', 'tablet.png'],
    ['Telefon', 'telefon.png'],
    ['Oyun kolu', 'oyun-kolu.png'],
    ['Şarj kablosu', 'sarj-kablosu.png'],
    ['Çalışmıyor', 'calismiyor.png'],
    ['Bozuk', 'bozuk.png'],
    ['Lego', 'lego.svg', { keepCase: true }],
    ['Televizyon', 'televizyon.png'],
    ['Bilgisayar', 'bilgisayar.png'],
    ['Kulaklık', 'kulaklik.png'],
    ['Kumanda', 'kumanda.png'],
    ['Şarj bitti', 'sarj-bitti.png'],
  ],
  yerler: [
    ['Eve', 'ev.png'],
    ['Köy', 'koy.png'],
    ['Elazığ', 'elazig.png', { keepCase: true, only: 'zeki' }],
  ],
};

/** Pictograms redrawn for Sesim Var (outlined style), by file stem. Seed
 *  words use one of these when it exists, otherwise their original picture. */
export const V2_PICTOS = new Set<string>(['ac', 'aciktim', 'aciyor', 'al', 'anne', 'ara', 'araba', 'arkadas', 'ates', 'ayak', 'az', 'baba', 'bacak', 'bak', 'banyo', 'bas', 'bekle', 'ben', 'bilgisayar', 'bilmiyorum', 'bitti', 'bogaz', 'bozuk', 'bugun', 'buyuk', 'calismiyor', 'cay', 'cizgi-film', 'cok', 'daha', 'dis', 'disari', 'dizi', 'doktor', 'dun', 'dur', 'dustu', 'ekmek', 'ekran', 'el', 'elazig', 'eve', 'evet', 'film', 'gel', 'geldi', 'getir', 'gidelim', 'git', 'gitti', 'gonder', 'goz', 'guzel', 'haberler', 'hasta', 'hastalandi', 'hastane', 'hayir', 'ic', 'ilac', 'internet', 'istemiyorum', 'istiyorum', 'iyi', 'izle', 'kalk', 'kan', 'kapat', 'karin', 'kasiniyor', 'kayboldu', 'kim', 'kirildi', 'kisiler', 'kizardi', 'kizgin', 'kol', 'korktum', 'koy', 'kucuk', 'kulak', 'kulaklik', 'kumanda', 'lego', 'market', 'minecraft', 'mutlu', 'muzik', 'ne', 'nerede', 'netflix', 'oksuruk', 'oldu', 'otur', 'oyna', 'oyun', 'oyun-kolu', 'ozledim', 'para', 'park', 'saril', 'sarj-bitti', 'sarj-kablosu', 'seviyorum', 'sicak', 'sikildim', 'simdi', 'sirt', 'soguk', 'sonra', 'su', 'susadim', 'tablet', 'tamam', 'telefon', 'televizyon', 'tuvalet', 'usudum', 'uyku', 'uyu', 'uzgun', 'var', 'ver', 'video', 'vurdum', 'yap', 'yardim', 'yarin', 'ye', 'yemek', 'yok', 'yoruldum', 'youtube']);

function pictoSrc(file: string): string {
  const stem = file.replace(/\.(png|svg)$/, '');
  const alias: Record<string, string> = { ev: 'eve' };
  const name = alias[stem] ?? stem;
  return V2_PICTOS.has(name) ? `pictos/v2/${name}.png` : `pictos/${file}`;
}

export interface LibraryItem {
  label: string;
  category: CategoryId;
  src: string;
}

/** Ready-made pictures that are not on the board yet. The board starts small;
 *  the family adds these from Ayarlar (they appear when the word is typed). */
export const LIBRARY: LibraryItem[] = (
  [
    ['Bugün', 'temel', 'bugun'],
    ['Yarın', 'temel', 'yarin'],
    ['Dün', 'temel', 'dun'],
    ['Arkadaş', 'kisiler', 'arkadas'],
    ['Gidelim', 'eylem', 'gidelim'],
    ['Geldi', 'eylem', 'geldi'],
    ['Gitti', 'eylem', 'gitti'],
    ['Aç', 'eylem', 'ac'],
    ['Kapat', 'eylem', 'kapat'],
    ['Kayboldu', 'temel', 'kayboldu'],
    ['Hastalandı', 'vucut', 'hastalandi'],
    ['Göz', 'vucut', 'goz'],
    ['Kulak', 'vucut', 'kulak'],
    ['El', 'vucut', 'el'],
    ['Boğaz', 'vucut', 'bogaz'],
    ['Sırt', 'vucut', 'sirt'],
    ['Ayak', 'vucut', 'ayak'],
    ['Kan', 'vucut', 'kan'],
    ['Vurdum', 'vucut', 'vurdum'],
    ['Öksürük', 'vucut', 'oksuruk'],
    ['Ateş', 'vucut', 'ates'],
    ['İyi', 'vucut', 'iyi'],
    ['Üzgün', 'duygu', 'uzgun'],
    ['Sıkıldım', 'duygu', 'sikildim'],
    ['Seviyorum', 'duygu', 'seviyorum'],
    ['Özledim', 'duygu', 'ozledim'],
    ['Güzel', 'duygu', 'guzel'],
    ['Korktum', 'duygu', 'korktum'],
    ['Kızgın', 'duygu', 'kizgin'],
    ['İnternet', 'ekran', 'internet'],
    ['Müzik', 'ekran', 'muzik'],
    ['Video', 'ekran', 'video'],
    ['Araba', 'esyalar', 'araba'],
    ['Para', 'esyalar', 'para'],
    ['Hastane', 'yerler', 'hastane'],
    ['Park', 'yerler', 'park'],
    ['Market', 'yerler', 'market'],
    ['Dışarı', 'yerler', 'disari'],
    // Everyday words (2026-11-22)
    ['İç', 'eylem', 'ic'],
    ['Ye', 'eylem', 'ye'],
    ['Otur', 'eylem', 'otur'],
    ['Kalk', 'eylem', 'kalk'],
    ['Dur', 'eylem', 'dur'],
    ['Uyu', 'eylem', 'uyu'],
    ['Sarıl', 'eylem', 'saril'],
    ['Büyük', 'temel', 'buyuk'],
    ['Küçük', 'temel', 'kucuk'],
    ['Çok', 'temel', 'cok'],
    ['Az', 'temel', 'az'],
    ['Soğuk', 'gunluk', 'soguk'],
  ] as [string, CategoryId, string][]
)
  .filter(([, , stem]) => V2_PICTOS.has(stem))
  .map(([label, category, stem]) => ({ label, category, src: `pictos/v2/${stem}.png` }));

/** Library pictures whose word starts with (or contains) what was typed. */
export function searchLibrary(query: string): LibraryItem[] {
  const q = lowerTr(query.trim());
  if (!q) return [];
  const starts = LIBRARY.filter((i) => lowerTr(i.label).startsWith(q));
  const contains = LIBRARY.filter((i) => !starts.includes(i) && lowerTr(i.label).includes(q));
  return [...starts, ...contains];
}

function slug(s: string): string {
  return lowerTr(s)
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function defaultSay(label: string, category: CategoryId | 'core', keepCase = false): string {
  if (keepCase || category === 'kisiler') return label;
  return lowerTr(label);
}

/** The built-in words of a board. Everyone gets the same words in the same
 *  places; Zeki's board adds the family's own names and places. */
export function seedWords(profile: Profile = 'genel'): Word[] {
  const words: Word[] = [];
  for (const [cat, list] of Object.entries(SEEDS) as [CategoryId | 'core', Seed[]][]) {
    list.forEach(([label, picto, opts], index) => {
      if (opts?.only && opts.only !== profile) return;
      words.push({
        id: `${cat}-${slug(label)}`,
        label,
        say: opts?.say ?? defaultSay(label, cat, opts?.keepCase),
        category: cat,
        slot: opts?.slot ?? index,
        hidden: !!opts?.hidden,
        picture: picto ? { kind: 'builtin', src: pictoSrc(picto) } : { kind: 'text' },
      });
    });
  }
  return words;
}

export function newWordId(label: string): string {
  return `w-${slug(label) || 'kelime'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** First free place on a category board (the first page, or both pages), or -1 when all are taken. */
export function freeSlot(words: Word[], category: CategoryId, places: number = SLOTS_PER_CATEGORY): number {
  const used = new Set(words.filter((w) => w.category === category).map((w) => w.slot));
  for (let i = 0; i < places; i++) if (!used.has(i)) return i;
  return -1;
}
