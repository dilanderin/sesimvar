// Lists every text the prerecorded voice needs, as JSON [{key, text, file}].
// Run: npx tsx scripts/voice-texts.ts > /tmp/texts.json
import { LIBRARY, defaultSay, seedWords } from '../src/lib/data';
import { FORM_WORD_IDS, SAY_FORM_TEXTS, wordForms } from '../src/lib/forms';
import { clipFile, clipKey } from '../src/lib/voice';

const texts = new Set<string>();
for (const w of [...seedWords('genel'), ...seedWords('zeki')]) texts.add(w.say);
for (const i of LIBRARY) texts.add(defaultSay(i.label, i.category));
for (const id of FORM_WORD_IDS) for (const f of wordForms({ id })) texts.add(f);
for (const f of SAY_FORM_TEXTS) texts.add(f);
// Ayarlar voice preview
texts.add('Merhaba. Birlikte konuşalım.');

const byKey = new Map<string, string>();
for (const t of texts) if (!byKey.has(clipKey(t))) byKey.set(clipKey(t), t.trim());
const out = [...byKey.keys()].sort().map((key) => ({ key, text: byKey.get(key)!, file: clipFile(key) }));
console.log(JSON.stringify(out, null, 1));
