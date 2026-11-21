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
  'kisiler-teyze': ['teyzem', 'teyzeme', 'teyzemi', 'teyzemle'],
  'kisiler-dayi': ['dayım', 'dayıma', 'dayımı', 'dayımla'],
  'kisiler-doktor': ['doktora', 'doktoru', 'doktorda', 'doktordan'],
  'kisiler-dilan': ["Dilan'a", "Dilan'ı", "Dilan'la", "Dilan'ın"],
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
  // Yerler: the card says "Eve" (to home)
  'yerler-eve': ['ev', 'evde', 'evden', 'evim'],
};

export function wordForms(word: Pick<Word, 'id'>): string[] {
  return FORMS[word.id] ?? [];
}

export const FORM_WORD_IDS = Object.keys(FORMS);
