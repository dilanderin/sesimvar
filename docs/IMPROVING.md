# Improving Sesim Var

Sesim Var is someone's voice. Every change has to make it better for the person who talks with it and for their family, and must never take anything away from them. The owner has asked for continuous, unattended improvement. These rules are what make that safe.

## Testing notes

- Messages: set `window.__sesimvarOpenUrl = (url) => console.log(url)` in a Playwright init script to capture the Messages link, because headless Chromium doesn't reliably report `sms:` navigations.
- Speech: stub `speechSynthesis.speak` in an init script to call `onend`.

## Rules (every run)

1. **Never move or remove what's on the board.** Existing words keep their category and place, because people find words by where they are (motor planning). New words go only into free places or the library. Hiding a word leaves its place empty.
2. **Never lose family data.** Words, recordings, photos and settings live on the device. Any change to the saved format needs a migration in `src/lib/store.ts` (and in the backup restore in `src/lib/backup.ts`) plus a vitest. Backup files from older versions must still restore.
3. **Keep it private and offline.** No accounts, no third-party analytics or trackers, and no new network calls, except optional ARASAAC search in Ayarlar and the owner's anonymous usage counts (`src/lib/usage.ts` → `functions/api/usage.ts` → D1 `sesimvar-usage`). Those counts stay numbers only: never words, sentences, names, recordings or IP addresses. The family can turn them off in Ayarlar → Yedek.
4. **Keep the design language.** Use the design canvas measurements, the Fredoka font, the category colours, day and night themes, calm mode (motion off), and real buttons that are 44px or larger with Turkish labels. All UI copy is Turkish. The tone is warm and simple.
5. **Make small, verified steps.** Do one to three focused improvements per run. `npm test` and `npm run build` must pass. Check the main board (landscape and portrait, day and night) and any screen you touched in Playwright, with no page errors, before pushing to `main`. Cloudflare Pages deploys `main` to https://sesimvar.d3asoft.com. The owner wants changes pushed **directly to `main`, no pull requests** (confirmed 2026-11-21), so the checks above are the only gate.
6. **Keep pictograms consistent.** New pictures use the outlined style in `docs/pictograms.md`, via Figma (file `SENncnywORYR4pXEtqvicf`) and `scripts/add-pictos.py`. Figma AI credits are limited: at most about 12 new images per run, and leave credits for the pictogram backlog first.
7. **Every built-in word has a voice clip.** After adding built-in words, library words or forms, run `npx tsx scripts/voice-texts.ts > /tmp/texts.json && python3 scripts/make-voice.py /tmp/texts.json` (needs `pip install edge-tts`, ffmpeg, and network access to speech.platform.bing.com: the "sesimvar" cloud environment allows it). `src/lib/__tests__/voice.test.ts` fails until the clips exist.
8. **Record what you did.** Add an entry to `CHANGELOG.md` and update the backlog below by ticking items off and adding new ideas.
9. **Stop rather than guess** when a change would affect how the person communicates in a way the family should decide, such as the core row, removing a feature, or changing what Gönder does. Leave it in the backlog under "Ask the family", and mention it in the run's report.

## Backlog (pick from the top, refine as you learn)

- [x] Finish the remaining pictograms (see `docs/pictograms.md`).
- [x] **Son cümleler** (recent sentences): a small list in the balloon area or in Ayarlar to say a recent sentence again with one tap.
- [x] **Accidental-tap protection** (repeat-tap guard done; "hold to select" still to do) in Ayarlar: ignore repeat taps within N ms, and optionally "hold to select" for unsteady hands.
- [x] **Speech speed** (pitch still to do) in Ses ve papağan.
- [x] **Word forms** (Turkish suffixes, in `src/lib/forms.ts`; add forms for new built-in words there): long-press a card to choose suya, suyu, suda… Keep a single tap working exactly as now.
- [x] **Library browser** in Kelime ekle: show the ready-made pictures by category, not only by typing.
- [x] **Second page per category** (2026-11-23): places 12–23, reached by **scrolling down** the board (snaps a page at a time) or tapping the chosen category again; dots on its button show the page. On by default (owner's choice). A category always opens on page 1 and only scrolls when page 2 has a visible word; with one page the board is pixel-identical to before.
- [x] **İlk haline döndür** in Ayarlar → Yedek, with a confirmation and an undo (the previous board is kept in localStorage `sesimvar:before-reset`; photos and recordings stay in IndexedDB).
- [ ] **The same young male voice for words the family types**: today they fall back to the device voice (female Yelda on iPad). Options: run Piper (open-source, `tr_TR-dfki-medium`, male) in the browser via onnxruntime-web, downloaded once and cached; or record those words here on request and ship them.
- [ ] **Usage-aware suggestions** (local only): in Ayarlar, show words the family often types but that are not on the board yet.
- [ ] **Accessibility**: VoiceOver labels audit, switch/keyboard scanning, high-contrast option.
- [ ] **Performance**: lighter first load, image lazy-loading in Ayarlar.

## Decided by the owner

- **Gönder** sends the sentence to the owner in the Messages app (2026-11-21). It opens Messages with the text filled in; iOS requires one tap on send. Without an address it only speaks.
- Changes are pushed directly to `main`, without pull requests.
- **Second page** (2026-11-23): on by default, as a scroll down ("2. sayfa kapalı ama scroll olabilir, niye olmasın?").
- **Usage counts** (2026-11-23): the owner wants to know how many people use the app, also offline. Anonymous device number, day, taps/sentences/sends, device kind, installed, version. On by default, switch in Ayarlar → Yedek. To answer "how many use it": query D1 `sesimvar-usage` (table `usage`) through the Cloudflare API.
- **Reset to original** (2026-11-23): the owner asked for it. It is behind a confirmation and can be undone right after.
- **Voice** (2026-11-22): the person who uses the board wants a young (about 20) male voice, not a family member's. The prerecorded "Ahmet" voice (Microsoft tr-TR-AhmetNeural, pitch +16 Hz, rate +6%; the owner picked this one, "daha genç") is the default. Family recordings still play first when a word has one.

## Ask the family (don't do without the owner)

- Changing the six words of the always-visible row by default.
