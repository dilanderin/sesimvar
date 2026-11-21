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
  { id: 'duygu', name: 'Duygu', color: '#F2B100', icon: 'pictos/duygu.png' },
  { id: 'ekran', name: 'Ekran', color: '#1C9BF6', icon: 'pictos/ekran.png' },
  { id: 'esyalar', name: 'Eşyalar', color: '#2BC866', icon: 'pictos/tablet.png' },
  { id: 'yerler', name: 'Yerler', color: '#C05BF0', icon: 'pictos/ev.png' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

/** Each category board has a fixed number of places. A hidden word keeps its
 *  place empty, so the other cards never move. */
export const SLOTS_PER_CATEGORY = 12;

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

type Seed = [label: string, picto: string | null, opts?: { say?: string; hidden?: boolean; keepCase?: boolean }];

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
    ['Dilan', 'dilan.svg', { keepCase: true }],
    ['Teyze', 'teyze.svg', { keepCase: true, hidden: true }],
    ['Dayı', 'dayi.svg', { keepCase: true, hidden: true }],
    ['Doktor', 'doktor.png', { keepCase: true, hidden: true }],
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
  duygu: [['Mutlu', 'duygu.png']],
  ekran: [
    ['Minecraft', 'minecraft.svg', { keepCase: true }],
    ['İzle', 'izle.svg'],
    ['Oyna', 'oyna.svg'],
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
  yerler: [['Eve', 'ev.png']],
};

/** Pictograms redrawn for Sesim Var (outlined style), by file stem. Seed
 *  words use one of these when it exists, otherwise their original picture. */
export const V2_PICTOS = new Set<string>(['ac', 'aciktim', 'aciyor', 'al', 'anne', 'ara', 'arkadas', 'baba', 'bacak', 'bak', 'banyo', 'bas', 'bekle', 'ben', 'bilmiyorum', 'bitti', 'bugun', 'cay', 'daha', 'dis', 'doktor', 'dun', 'dustu', 'ekmek', 'evet', 'gel', 'geldi', 'getir', 'gidelim', 'git', 'gitti', 'gonder', 'hasta', 'hayir', 'ilac', 'istemiyorum', 'istiyorum', 'izle', 'kapat', 'karin', 'kasiniyor', 'kim', 'kirildi', 'kisiler', 'kizardi', 'kol', 'ne', 'nerede', 'oldu', 'oyna', 'sicak', 'simdi', 'sonra', 'su', 'susadim', 'tamam', 'tuvalet', 'usudum', 'uyku', 'var', 'ver', 'yap', 'yardim', 'yarin', 'yemek', 'yok', 'yoruldum']);

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

export function seedWords(): Word[] {
  const words: Word[] = [];
  for (const [cat, list] of Object.entries(SEEDS) as [CategoryId | 'core', Seed[]][]) {
    list.forEach(([label, picto, opts], slot) => {
      words.push({
        id: `${cat}-${slug(label)}`,
        label,
        say: opts?.say ?? defaultSay(label, cat, opts?.keepCase),
        category: cat,
        slot,
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

/** First free place on a category board, or -1 when all places are taken. */
export function freeSlot(words: Word[], category: CategoryId): number {
  const used = new Set(words.filter((w) => w.category === category).map((w) => w.slot));
  for (let i = 0; i < SLOTS_PER_CATEGORY; i++) if (!used.has(i)) return i;
  return -1;
}
