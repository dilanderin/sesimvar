import type { Word } from './data';

/** Hand-written Turkish forms for the built-in words, shown when a card is held
 *  (if "Kelime çekimleri" is on in Ayarlar). Written out rather than generated,
 *  so irregular words are right: su → suyu, karın → karnım, ilaç → ilacı.
 *  Nouns: my/to/at/from…; body parts: kolum (so "kolum acıyor" works);
 *  people: annem, anneme…; verbs: -iyorum, -dim, -sin, -me (don't). */
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
  'kisiler-guler-teyze': ["Güler Teyze'ye", "Güler Teyze'yi", "Güler Teyze'yle", "Güler Teyze'nin"],
  'kisiler-dayi': ['dayım', 'dayıma', 'dayımı', 'dayımla'],
  'kisiler-doktor': ['doktora', 'doktoru', 'doktorda', 'doktordan'],
  'kisiler-dilan': ["Dilan'a", "Dilan'ı", "Dilan'la", "Dilan'ın"],
  'kisiler-baris': ["Barış'a", "Barış'ı", "Barış'la", "Barış'ın"],
  // Eylem (and the same verbs on Ekran)
  'eylem-gel': ['geliyorum', 'geldim', 'gelsin', 'gelme'],
  'eylem-git': ['gidiyorum', 'gittim', 'gitsin', 'gitme'],
  'eylem-al': ['alıyorum', 'aldım', 'alsın', 'alma'],
  'eylem-ver': ['veriyorum', 'verdim', 'versin', 'verme'],
  'eylem-getir': ['getiriyorum', 'getirdim', 'getirsin', 'getirme'],
  'eylem-bak': ['bakıyorum', 'baktım', 'baksın', 'bakma'],
  'eylem-oyna': ['oynuyorum', 'oynadım', 'oynasın', 'oynama'],
  'eylem-izle': ['izliyorum', 'izledim', 'izlesin', 'izleme'],
  'eylem-ara': ['arıyorum', 'aradım', 'arasın', 'arama'],
  'eylem-bekle': ['bekliyorum', 'bekledim', 'beklesin', 'bekleme'],
  'eylem-yap': ['yapıyorum', 'yaptım', 'yapsın', 'yapma'],
  'eylem-gonder': ['gönderiyorum', 'gönderdim', 'göndersin', 'gönderme'],
  'ekran-izle': ['izliyorum', 'izledim', 'izlesin', 'izleme'],
  'ekran-oyna': ['oynuyorum', 'oynadım', 'oynasın', 'oynama'],
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

/** Boards saved before 2026-11-22 keep Güler Teyze under the old "Teyze" id. */
const SAME_AS: Record<string, string> = { 'kisiler-teyze': 'kisiler-guler-teyze' };

export function wordForms(word: Pick<Word, 'id'> & { label?: string }): string[] {
  if (word.id === 'kisiler-teyze' && word.label !== 'Güler Teyze') return [];
  return FORMS[SAME_AS[word.id] ?? word.id] ?? [];
}

export const FORM_WORD_IDS = Object.keys(FORMS);
