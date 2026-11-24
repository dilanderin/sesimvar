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

## Status

All built-in words use the outlined set (121 pictures, plus 12 library pictures added on 2026-11-24: polite words and foods). The exceptions are the relatives (Amca, Hala, Teyze, Dayı) and Dilan, which keep "add a photo" cards on purpose. New words follow the steps above.

## Words from the first version's board

These go on the board (not only in the library) where the category has room:
- Ekran: Oyun, YouTube, Netflix, Film, Dizi, Çizgi film, Haberler, joining Minecraft, İzle and Oyna (10 of 12).
- Yerler: Köy and Elazığ, joining Eve.

Vücut (Vurdum, Hastalandı, İyi) and Eşyalar (Araba) are full, so those go in the library.
Saved boards gain new built-in words automatically when the word's place is free.
