# Dino English 🦖

Tablet English-learning game for a Hebrew-speaking 5-year-old who can't read yet.
Every instruction is spoken audio; no text is needed by the child.

- **Stack:** Vite + React + TypeScript, installable PWA, fully offline after first load (service worker precaches all audio + images).
- **Voices (pre-generated with edge-tts, no runtime TTS):** English `en-US-GuyNeural`, Hebrew `he-IL-HilaNeural` – see `app/scripts/voices.json`.
- **Progress:** stored on-device in IndexedDB (Dexie), per child profile. Export/import JSON backup in the parent area.
- **Hosting:** GitHub Pages via `.github/workflows/deploy.yml` ($0).

## Layout

```
app/
  src/content/packs/*.json   word packs (one per category) – THE source of truth
  src/lib/                   audio engine, IndexedDB, Leitner learning engine, speech, instruction timer
  src/games/                 Memory, ListenPick, BubblePop, SortIt, WhereIs, ColorIt, SayIt
  src/screens/               Splash, Profiles, Home, Session (intro + rounds + sticker), Album, ParentGate, Parent
  scripts/phrases.py         every audio file the app needs (derived from the packs)
  scripts/gen_audio.py       npm run gen:audio  – generates only MISSING mp3s with edge-tts
  scripts/gen_images.py      npm run gen:images – OpenMoji downloads, colour balloons, number cards, stickers, icons
  scripts/check_assets.py    npm run check      – verifies every word has image + all audio (runs before build)
  public/audio/              generated mp3s (committed, so CI needs no TTS)
  public/images/             images + CREDITS.md
```

## Commands

```bash
cd app
npm install
npm run dev          # local dev server
npm run gen:audio    # generate missing audio (needs: pip install edge-tts)
npm run gen:images   # generate missing images (needs: pip install pillow)
npm run check        # verify assets
npm run build        # check + tsc + vite build  (BASE_PATH=/repo-name/ for GitHub Pages)
```

## Adding a word pack

1. Create `app/src/content/packs/<id>.json` (copy an existing one). Fields per word:
   `id`, `en`, `he`, `he_find` ("מצא את ה…!"), `category`, `image`, `source`
   (`source` = `"photo"` for a photo you put in `public/images/<cat>/<id>.jpg`, or an OpenMoji hex code like `"1F436"`).
2. `npm run gen:images && npm run gen:audio && npm run check`
3. Commit + push → GitHub Action redeploys. Devices pick up the update automatically on next launch (online).

## Changing the voice

Edit `app/scripts/voices.json`, delete `app/public/audio/`, run `npm run gen:audio`.

## Learning logic (short)

- New words are introduced (English → Hebrew → English, twice) before entering games; 1–3 per "Play!" session.
- Leitner boxes 0–4 (intervals 0/1/3/7/14 days). Wrong answer → box down. A word is **learned** after correct answers on ≥3 different days (configurable) and box ≥ 3. Learned words resurface in ~15% of rounds.
- Instruction audio: English → repeat after 5 s → Hebrew once after 7 s more → then the English word every 10 s. All configurable in the parent area.
- "Known" packs (colors, numbers, animals, body) start as already-introduced review words.

## Credits

Images: OpenMoji (CC BY-SA 4.0, https://openmoji.org) and free-license photos from Wikimedia Commons – see `app/public/images/CREDITS.md`.
Mascot: original SVG.
