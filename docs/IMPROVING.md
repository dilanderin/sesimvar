# Improving Sesim Var

Sesim Var is someone's voice. Every change has to make it better for the person who talks with it and for their family, and must never take anything away from them. The owner has asked for continuous, unattended improvement. These rules are what make that safe.

## Rules (every run)

1. **Never move or remove what's on the board.** Existing words keep their category and place, because people find words by where they are (motor planning). New words go only into free places or the library. Hiding a word leaves its place empty.
2. **Never lose family data.** Words, recordings, photos and settings live on the device. Any change to the saved format needs a migration in `src/lib/store.ts` (and in the backup restore in `src/lib/backup.ts`) plus a vitest. Backup files from older versions must still restore.
3. **Keep it private and offline.** No accounts, no analytics or trackers, and no new network calls, except optional ARASAAC search in Ayarlar.
4. **Keep the design language.** Use the design canvas measurements, the Fredoka font, the category colours, day and night themes, calm mode (motion off), and real buttons that are 44px or larger with Turkish labels. All UI copy is Turkish. The tone is warm and simple.
5. **Make small, verified steps.** Do one to three focused improvements per run. `npm test` and `npm run build` must pass. Check the main board (landscape and portrait, day and night) and any screen you touched in Playwright, with no page errors, before pushing to `main`. Cloudflare Pages deploys `main` to https://sesimvar.d3asoft.com. The owner wants changes pushed **directly to `main`, no pull requests** (confirmed 2026-11-21), so the checks above are the only gate.
6. **Keep pictograms consistent.** New pictures use the outlined style in `docs/pictograms.md`, via Figma (file `SENncnywORYR4pXEtqvicf`) and `scripts/add-pictos.py`. Figma AI credits are limited: at most about 12 new images per run, and leave credits for the pictogram backlog first.
7. **Record what you did.** Add an entry to `CHANGELOG.md` and update the backlog below by ticking items off and adding new ideas.
8. **Stop rather than guess** when a change would affect how the person communicates in a way the family should decide, such as the core row, removing a feature, or changing what Gönder does. Leave it in the backlog under "Ask the family", and mention it in the run's report.

## Backlog (pick from the top, refine as you learn)

- [ ] Finish the remaining pictograms (see `docs/pictograms.md`).
- [x] **Son cümleler** (recent sentences): a small list in the balloon area or in Ayarlar to say a recent sentence again with one tap.
- [x] **Accidental-tap protection** (repeat-tap guard done; "hold to select" still to do) in Ayarlar: ignore repeat taps within N ms, and optionally "hold to select" for unsteady hands.
- [x] **Speech speed** (pitch still to do) in Ses ve papağan.
- [ ] **Word forms** (Turkish suffixes): long-press a card to choose suya, suyu, suda… Keep a single tap working exactly as now.
- [ ] **Library browser** in Kelime ekle: show the ready-made pictures by category, not only by typing.
- [ ] **More vocabulary in the library**: common verbs (iç, ye, uyu, otur, kalk), describing words (büyük, küçük, sıcak, soğuk, çok, az), feelings and needs, each with a pictogram.
- [ ] **Larger boards option**: a second page per category, off by default. It must not change the first page.
- [ ] **Usage-aware suggestions** (local only): in Ayarlar, show words the family often types but that are not on the board yet.
- [ ] **Accessibility**: VoiceOver labels audit, switch/keyboard scanning, high-contrast option.
- [ ] **Performance**: lighter first load, image lazy-loading in Ayarlar.

## Ask the family (don't do without the owner)

- What should **Gönder** send to, and to whom? (For now it speaks and celebrates.)
- Changing the six words of the always-visible row by default.
