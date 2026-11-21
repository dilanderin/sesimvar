# Sesim Var

**Sesim Var** ("I have a voice") is a picture-based talking board (AAC) in Turkish, built from the original design canvas. The child taps pictures to build a sentence in the speech balloon. **Oku** reads it aloud word by word, and **Gönder** sends it off with a small celebration. Pırpır the parrot reacts to every step.

It runs entirely on the device. There are no accounts and no ads, and the family's words, photos and voice recordings never leave the iPad.

Live at https://sesimvar.d3asoft.com

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (installable, works offline)
npm test           # unit tests
```

On the iPad, open the built site in Safari and use **Share → Add to Home Screen**. It then opens full screen and works offline.

## What's in it

**Main screen** (landscape 1194×834 and portrait 834×1194, scaled to fit any screen)
- Sentence balloon with backspace and clear buttons. The first word is capitalised, and names keep their capital letter.
- **Oku** (karaoke reading): each word lifts and is underlined in its category colour as it is spoken, while the parrot "talks".
- **Gönder**: the arrow shoots up, 40 pieces of confetti fall in the nine category colours, the parrot jumps, then the balloon empties and shows "Gönderildi".
- An always-visible row of six words (Evet, Hayır, İstiyorum, Yok, Bitti, Daha) that stays in the same place on every screen.
- A 12-place board per category. A hidden word leaves its place empty, so the other cards never move.
- Nine categories (Temel, Kişiler, Eylem, Günlük, Vücut, Duygu, Ekran, Eşyalar, Yerler), each with its own colour.
- Day and night themes, plus an automatic mode (day from 07:00 to 19:30).
- A tap takes under a second: press (0–80 ms), jelly and sparkles (80–300 ms), the picture flies to the balloon (300–600 ms), then lands with a pop while the parrot hops and says the word (600–850 ms).
- **Sakin mod (calm mode)**: when motion is turned off, a tap shows a ring around the card and the word appears with no flying, lifting or confetti. It defaults to calm when iOS "Reduce Motion" is on.
- The parrot's poses: idle (breathing and blinking), looking, hopping, talking, celebrating, and cheeky after a while without touches.

**Ayarlar (settings, for the family)**: hold the gear in the top-right corner for 2 seconds to open it. This can be unlocked so a single tap opens it.
- **Kelime ekle (add a word)**: the picture can be an ARASAAC pictogram (searched online and then stored on the device), a photo from the camera, or text only. You can also record the word in a family member's voice.
- **Kelimeler (words)**: show or hide each word, drag the handle to reorder, record or remove a family voice, and delete words you added.
- **Hep görünen satır**: choose which six words appear in the always-visible row.
- **Görünüm (appearance)**: card size, day/night, and motion on or off.
- **Yedek (backup)**: **Yedekle** saves the whole board, including recordings and photos, into one `.json` file. On iPad it opens the share sheet so you can save it to Files or iCloud Drive. **Geri yükle** restores a backup file after asking for confirmation.
- **Ses ve papağan (voice and parrot)**: pick the Turkish voice (Yelda on iOS) and preview it, and rename the parrot. Family recordings always play instead of the synthetic voice.

## How it's built

- Vite, React 19 and TypeScript, with inline styles that follow the design's measurements closely.
- `src/lib/theme.ts` derives every category tint by mixing the category's base colour into white by day or into the dark card colour by night, using the same strengths as the design.
- `src/lib/decor.ts` holds the background art (sun, clouds, birds, ferns, flowers, moon, stars and fireflies) extracted from the design artboards.
- `src/components/Parrot.tsx` draws the parrot once and poses it from a few numbers: lift, tilt, wing angle, eyes and beak.
- Speech uses the Web Speech API with a Turkish voice. Recordings are captured with MediaRecorder and stored in IndexedDB, alongside photos and pictograms. The board itself is saved in localStorage.
- The offline app shell is provided by `vite-plugin-pwa`. ARASAAC images are cached after first use.

## Credits

Most pictograms in `public/pictos/*.png` and the pictures fetched in Ayarlar come from ARASAAC (arasaac.org): author Sergio Palao, owner Gobierno de Aragón (Spain), licence CC BY-NC-SA. The SVG pictograms in `public/pictos/*.svg` and the parrot are the redrawn versions from the original design.
