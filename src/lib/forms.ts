import type { Word } from './data';
import { lowerTr } from './turkish';

/** Hand-written Turkish forms for the built-in words, shown when a card is held
 *  (if "Kelime çekimleri" is on in Ayarlar). Written out rather than generated,
 *  so irregular words are right: su → suyu, karın → karnım, ilaç → ilacı.
 *  Nouns: my/to/at/from…; body parts: kolum (so "kolum acıyor" works);
 *  people: annem, anneme…; verbs: -iyorum, -dim, -di (geldi, yaptı), -sin, -me (don't). */
const FORMS: Record<string, string[]> = {
  // Günlük
  'gunluk-su': ['suyu', 'suya', 'suda', 'sudan'],
  'gunluk-yemek': ['yemeği', 'yemeğe', 'yemekte', 'yemekten'],
  'gunluk-cay': ['çayı', 'çaya', 'çayda', 'çaydan'],
  'gunluk-ekmek': ['ekmeği', 'ekmeğe', 'ekmekte', 'ekmekten'],
  'gunluk-tuvalet': ['tuvalete', 'tuvalette', 'tuvaletten', 'tuvaletim'],
  'gunluk-banyo': ['banyoya', 'banyoda', 'banyodan', 'banyoyu'],
  'gunluk-uyku': ['uykum', 'uykuya', 'uykuda', 'uykumu'],
  // Vücut: "my …" first, so "kolum acıyor" is one hold away
  'vucut-kol': ['kolum', 'kollarım', 'koluma', 'kolumda'],
  'vucut-bacak': ['bacağım', 'bacaklarım', 'bacağıma', 'bacağımda'],
  'vucut-bas': ['başım', 'başıma', 'başımda', 'başımı'],
  'vucut-karin': ['karnım', 'karnıma', 'karnımda', 'karnımı'],
  'vucut-dis': ['dişim', 'dişlerim', 'dişime', 'dişimde'],
  'vucut-ilac': ['ilacım', 'ilacı', 'ilaca', 'ilaçlar'],
  // Kişiler
  'kisiler-anne': ['annem', 'anneme', 'annemi', 'annemle'],
  'kisiler-baba': ['babam', 'babama', 'babamı', 'babamla'],
  'kisiler-amca': ['amcam', 'amcama', 'amcamı', 'amcamla'],
  'kisiler-hala': ['halam', 'halama', 'halamı', 'halamla'],
  'kisiler-teyze': ['teyzem', 'teyzeme', 'teyzemi', 'teyzemle'],
  'kisiler-guler-teyze': ["Güler Teyze'ye", "Güler Teyze'yi", "Güler Teyze'yle", "Güler Teyze'nin"],
  'kisiler-dayi': ['dayım', 'dayıma', 'dayımı', 'dayımla'],
  'kisiler-doktor': ['doktora', 'doktoru', 'doktorda', 'doktordan'],
  'kisiler-dilan': ["Dilan'a", "Dilan'ı", "Dilan'la", "Dilan'ın"],
  'kisiler-baris': ["Barış'a", "Barış'ı", "Barış'la", "Barış'ın"],
  // Eylem (and the same verbs on Ekran)
  'eylem-gel': ['geliyorum', 'geldim', 'geldi', 'gelsin', 'gelme'],
  'eylem-git': ['gidiyorum', 'gittim', 'gitti', 'gitsin', 'gitme'],
  'eylem-al': ['alıyorum', 'aldım', 'aldı', 'alsın', 'alma'],
  'eylem-ver': ['veriyorum', 'verdim', 'verdi', 'versin', 'verme'],
  'eylem-getir': ['getiriyorum', 'getirdim', 'getirdi', 'getirsin', 'getirme'],
  'eylem-bak': ['bakıyorum', 'baktım', 'baktı', 'baksın', 'bakma'],
  'eylem-oyna': ['oynuyorum', 'oynadım', 'oynadı', 'oynasın', 'oynama'],
  'eylem-izle': ['izliyorum', 'izledim', 'izledi', 'izlesin', 'izleme'],
  'eylem-ara': ['arıyorum', 'aradım', 'aradı', 'arasın', 'arama'],
  'eylem-bekle': ['bekliyorum', 'bekledim', 'bekledi', 'beklesin', 'bekleme'],
  'eylem-yap': ['yapıyorum', 'yaptım', 'yaptı', 'yapsın', 'yapma'],
  'eylem-gonder': ['gönderiyorum', 'gönderdim', 'gönderdi', 'göndersin', 'gönderme'],
  'ekran-izle': ['izliyorum', 'izledim', 'izledi', 'izlesin', 'izleme'],
  'ekran-oyna': ['oynuyorum', 'oynadım', 'oynadı', 'oynasın', 'oynama'],
  'ekran-minecraft': ["Minecraft'ı", "Minecraft'a", "Minecraft'ta"],
  // Eşyalar
  'esyalar-tablet': ['tableti', 'tablete', 'tablette', 'tabletim'],
  'esyalar-telefon': ['telefonu', 'telefona', 'telefonda', 'telefonum'],
  'esyalar-oyun-kolu': ['oyun kolunu', 'oyun koluna', 'oyun kolunda', 'oyun kolum'],
  'esyalar-sarj-kablosu': ['şarj kablosunu', 'şarj kablosuna', 'şarj kablosunda', 'şarj kablom'],
  'esyalar-lego': ['legoyu', 'legoya', 'legolar', 'legom'],
  'esyalar-televizyon': ['televizyonu', 'televizyona', 'televizyonda', 'televizyondan'],
  'esyalar-bilgisayar': ['bilgisayarı', 'bilgisayara', 'bilgisayarda', 'bilgisayarım'],
  'esyalar-kulaklik': ['kulaklığı', 'kulaklığa', 'kulaklıkta', 'kulaklığım'],
  'esyalar-kumanda': ['kumandayı', 'kumandaya', 'kumandada', 'kumandam'],
  'ekran-youtube': ["YouTube'u", "YouTube'da", "YouTube'dan"],
  'ekran-netflix': ["Netflix'i", "Netflix'te", "Netflix'ten"],
  'ekran-film': ['filmi', 'filme', 'filmde', 'filmler'],
  'ekran-dizi': ['diziyi', 'diziye', 'dizide', 'diziler'],
  'ekran-cizgi-film': ['çizgi filmi', 'çizgi filmler'],
  'ekran-haberler': ['haberleri', 'haberlerde'],
  'ekran-oyun': ['oyunu', 'oyuna', 'oyunda', 'oyunlar'],
  // Yerler: the card says "Eve" (to home)
  'yerler-eve': ['ev', 'evde', 'evden', 'evim'],
  'yerler-koy': ['köye', 'köyde', 'köyden', 'köyüm'],
  'yerler-elazig': ["Elazığ'a", "Elazığ'da", "Elazığ'dan"],
};

/** Forms for action words the family adds from Hazır resimler (they get a new
 *  id when added, so these are found by the spoken word instead). */
const SAY_FORMS: Record<string, string[]> = {
  iç: ['içiyorum', 'içtim', 'içti', 'içsin', 'içme'],
  ye: ['yiyorum', 'yedim', 'yedi', 'yesin', 'yeme'],
  otur: ['oturuyorum', 'oturdum', 'oturdu', 'otursun', 'oturma'],
  kalk: ['kalkıyorum', 'kalktım', 'kalktı', 'kalksın', 'kalkma'],
  dur: ['duruyorum', 'durdum', 'durdu', 'dursun', 'durma'],
  uyu: ['uyuyorum', 'uyudum', 'uyudu', 'uyusun', 'uyuma'],
  sarıl: ['sarılıyorum', 'sarıldım', 'sarıldı', 'sarılsın', 'sarılma'],
  aç: ['açıyorum', 'açtım', 'açtı', 'açsın', 'açma'],
  kapat: ['kapatıyorum', 'kapattım', 'kapattı', 'kapatsın', 'kapatma'],
  // Body parts from Hazır resimler: "my …" first, like the built-in ones.
  göz: ['gözüm', 'gözlerim', 'gözüme', 'gözümde'],
  kulak: ['kulağım', 'kulaklarım', 'kulağıma', 'kulağımda'],
  el: ['elim', 'ellerim', 'elime', 'elimde'],
  boğaz: ['boğazım', 'boğazıma', 'boğazımda'],
  sırt: ['sırtım', 'sırtıma', 'sırtımda'],
  ayak: ['ayağım', 'ayaklarım', 'ayağıma', 'ayağımda'],
};


export function wordForms(word: Pick<Word, 'id'> & { label?: string; say?: string }): string[] {
  // Zeki's boards saved before 2026-11-23 keep Güler Teyze under the "Teyze" id.
  const id = word.id === 'kisiler-teyze' && word.label === 'Güler Teyze' ? 'kisiler-guler-teyze' : word.id;
  if (id === 'kisiler-teyze' && word.label && word.label !== 'Teyze') return [];
  const byId = FORMS[id];
  if (byId) return byId;
  return word.say ? (SAY_FORMS[lowerTr(word.say.trim())] ?? []) : [];
}

export const FORM_WORD_IDS = Object.keys(FORMS);
/** Every form of the library action words (for recording the voice). */
export const SAY_FORM_TEXTS = Object.values(SAY_FORMS).flat();

/** Body parts and what can be wrong with them: "Kol" + "acıyor" is said as
 *  "Kolum acıyor", the way people say it. */
const BODY_PARTS = new Set(['kol', 'bacak', 'baş', 'karın', 'diş', 'göz', 'kulak', 'el', 'boğaz', 'sırt', 'ayak']);
const BODY_STATES = new Set(['acıyor', 'ağrıyor', 'kaşınıyor', 'kızardı', 'kırıldı', 'kanıyor', 'şişti']);

/** The form the previous word should take before `next` ("kolum" before
 *  "acıyor"), or undefined to leave it as it is. A form the person chose
 *  themselves is never changed. */
export function formBefore(prev: { word: Word; form?: string }, next: Pick<Word, 'say'>): string | undefined {
  if (prev.form) return undefined;
  const part = lowerTr(prev.word.say.trim());
  if (!BODY_PARTS.has(part) || !BODY_STATES.has(lowerTr(next.say.trim()))) return undefined;
  const mine = wordForms(prev.word)[0];
  return mine && mine !== part ? mine : undefined;
}
