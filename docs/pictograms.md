# Pictograms

The app's own pictograms live in `public/pictos/v2/` (256×256 transparent PNG). They were generated with Figma's image generation (model `gpt-image-2.5-flare`) and the originals are in the Figma file "Sesim Var — Pictograms". They then had their white background removed and were reduced to 128 colours.

A seed word uses `pictos/v2/<stem>.png` automatically when that file exists (see `pictoSrc` and `V2_PICTOS` in `src/lib/data.ts`). Boards saved earlier pick up new pictures on the next launch (`refreshSeedPictures`). Extra words that are not on the board go in `LIBRARY`.

## Adding new ones

1. Generate each picture in the Figma file with the style prompt below. Each result's thumbnail is saved locally as a JPG under the session's `tool-results` folder.
2. List them in a TSV file, one `stem<TAB>path` per line, and run `python3 scripts/add-pictos.py map.tsv`.
3. Add any word that isn't on the board to `LIBRARY` in `src/lib/data.ts`.
4. Run `npm test` and `npm run build`, then push. Cloudflare Pages deploys `main` automatically.

## Style prompt (style 4, "outlined")

> AAC pictogram, OUTLINED style. Subject: "<english gloss>" — <what to draw, following the ARASAAC composition>. Style: friendly sticker-like picture symbol with bold, even, dark-brown outlines (#3A2420, thick consistent line weight, rounded caps) around every shape, flat bright color fills with at most one simple highlight, clean and bold like a children's picture-symbol set. Palette: <colours from the app palette>. Single centered subject filling about 85% of the frame, instantly readable at small size, no text, no letters, plain pure white background.

The recurring character has short brown hair and a blue t-shirt. Body-part pictures use a dark-brown arrow pointing at the part.

## Done (67)

evet hayir istiyorum yok bitti daha · oldu var istemiyorum yardim tamam bilmiyorum ben ne nerede kim simdi sonra · bugun yarin dun · anne baba arkadas doktor kisiler · gel git al ver getir bak oyna izle ara bekle yap gonder gidelim geldi gitti ac kapat · su yemek aciktim susadim cay ekmek tuvalet banyo uyku yoruldum usudum sicak · kol bacak aciyor kasiniyor kizardi dustu kirildi hasta bas karin dis ilac

## To do (54)

- Vücut extras: hastalandi goz kulak el bogaz sirt ayak kan vurdum oksuruk ates iyi
- Duygu: mutlu uzgun sikildim seviyorum ozledim guzel korktum kizgin
- Ekran: minecraft oyun youtube netflix film dizi cizgi-film haberler internet muzik video, plus the category icon `ekran`. Don't copy brand logos: draw YouTube as a red rounded play-button screen (a generic video player), Netflix as a TV with popcorn, and Dizi as a TV showing episode frames.
- Eşyalar: tablet telefon oyun-kolu sarj-kablosu calismiyor bozuk lego televizyon bilgisayar kulaklik kumanda sarj-bitti araba para
- Yerler: eve koy elazig hastane park market disari kayboldu. Draw Elazığ as a hometown: a small city skyline with a map pin.

The relatives (Amca, Hala, Teyze, Dayı) and Dilan keep "add a photo" cards on purpose.

## Words from the first version's board

These go on the board (not only in the library) where the category has room:
- Ekran: Oyun, YouTube, Netflix, Film, Dizi, Çizgi film, Haberler, joining Minecraft, İzle and Oyna (10 of 12).
- Yerler: Köy and Elazığ, joining Eve.

Vücut (Vurdum, Hastalandı, İyi) and Eşyalar (Araba) are full, so those go in the library.
Saved boards gain new built-in words automatically when the word's place is free.
