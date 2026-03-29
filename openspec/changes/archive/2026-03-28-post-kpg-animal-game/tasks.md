## 1. Animal Dataset

- [x] 1.1 Create `animal-game/js/animals.js` with the `ANIMALS` array — 100 extant animals (level 1–5, well-known to enthusiast-known) covering mammals, birds, reptiles, fish, and invertebrates across all continents; include all required fields: `name`, `wiki`, `level`, `length`, `speed`, `appeared`, `period`, `diet`, `geo`, `extinct: false`
- [x] 1.2 Add 100 extinct Cenozoic animals to `ANIMALS` — covering major megafauna groups (proboscideans, terror birds, saber-toothed cats, ground sloths, giant birds, chalicotheres, etc.) with `extinct: true` and `appeared` values between 0.001–66 Ma
- [x] 1.3 Verify every entry has non-null `speed` and `appeared` values, and that no two entries have the same `wiki` key
- [x] 1.4 Assign `level` values so level-1 animals are universally recognized (lion, elephant, great white shark) and level-5 animals are enthusiast-tier (Andrewsarchus, Chalicotherium, Gastornis)

## 2. Data Fetch Script

- [x] 2.1 Create `scripts/fetch-animal-data.py` mirroring `scripts/fetch-dino-data.py` — reads `animal-game/js/animals.js`, fetches Wikipedia image + short/full summary for each `wiki` key, writes `animal-game/js/animal-data.js` as `const ANIMAL_DATA = { ... }`
- [x] 2.2 Add a `fetch-animal-data` target to `Makefile` that runs the new script
- [x] 2.3 Run the script to generate an initial `animal-game/js/animal-data.js`; manually verify a sample of entries have images and descriptions

## 3. Game Shell — File Structure

- [x] 3.1 Create `animal-game/` directory and copy `index.html` from the dino game; update `<title>` to "CenozoiQuest" and all in-page headings/branding
- [x] 3.2 Copy `style.css` to `animal-game/style.css`; update color palette to Cenozoic theme (cooler greens, blues, earth tones) and replace any dino-specific imagery/emoji
- [x] 3.3 Copy `js/game.js`, `js/scores.js`, and `js/config.js` into `animal-game/js/`; update `index.html` script tags to reference the local copies plus `animals.js` and `animal-data.js`
- [x] 3.4 In `animal-game/js/scores.js`, rename localStorage keys to `cenozoiquest_scores` to avoid collision with the dino game
- [x] 3.5 In `animal-game/js/config.js`, point the leaderboard to a separate Google Sheets target (or add a `game: 'animal'` parameter to the existing endpoint)

## 4. Mode Sequence Update

- [x] 4.1 In `animal-game/js/game.js`, update `ALL_MODES` to `['name-match', 'evolved-first', 'faster', 'pic-match']`
- [x] 4.2 Update `MODE_SEQUENCE_NO_IMAGES` to `['evolved-first', 'faster', 'evolved-first', 'faster', 'evolved-first']`
- [x] 4.3 Replace all references to `DINOS` / `DINO_DATA` with `ANIMALS` / `ANIMAL_DATA` in `animal-game/js/game.js`

## 5. Evolved-First Question Type

- [x] 5.1 Add `buildEvolvedFirstQuestion()` function in `animal-game/js/game.js` — selects two animals from the current pool where `appeared` values differ by ≥ 0.5 Ma; sets correct answer to the one with the smaller `appeared` value
- [x] 5.2 Render the evolved-first question using the same two-option battle layout as `size-battle`; show "Which evolved FIRST?" as the prompt
- [x] 5.3 Add keyboard navigation for evolved-first (left/right arrows + Space/Enter) consistent with existing battle-mode behavior
- [x] 5.4 In the answer feedback for evolved-first, display both animals' `appeared` values and `period` labels (e.g., "First appeared: 2.6 Ma — Pleistocene")
- [x] 5.5 Handle the modern-vs-extinct pairing rule: living animals (`appeared ≤ 0.001`) are always treated as more recent and are never the correct "evolved first" answer when paired with a Cenozoic extinct animal

## 6. Faster Question Type

- [x] 6.1 Add `buildFasterQuestion()` function in `animal-game/js/game.js` — selects two animals from the current pool where `speed` values differ by ≥ 2 km/h; sets correct answer to the one with the higher `speed` value
- [x] 6.2 Render the faster question using the same two-option battle layout; show "Which is FASTER?" as the prompt
- [x] 6.3 Add keyboard navigation for faster question (left/right arrows + Space/Enter)
- [x] 6.4 In the answer feedback, display both speeds as "{speed} km/h ({mph} mph)" — do NOT reveal speeds before the answer is submitted

## 7. Extinct Indicator in Feedback

- [x] 7.1 In the answer feedback card rendering logic, check `animal.extinct`; if `true`, append a 💀 icon or "Extinct" badge to the animal's name in the card
- [x] 7.2 For extant animals, optionally add a small "Still alive today!" note in the feedback card

## 8. World Themes

- [x] 8.1 Replace the 11 world theme entries in `animal-game/js/game.js` with the Cenozoic sequence: Paleocene Wilds, Eocene Jungles, Oligocene Steppes, Miocene Savannas, Pliocene Grasslands, Ice Age Tundra, Holocene Dawn, Modern Savanna, Deep Ocean, Frozen Arctic, Ancient Rainforest
- [x] 8.2 Update each theme's `color`, `secondaryColor`, and `emoji` to match its era/biome (e.g., Ice Age Tundra → icy blues + ❄️🦣; Modern Savanna → warm tans + 🦁🌿)
- [x] 8.3 Update the world map screen background and progress markers in `style.css` to reflect the new themes

## 9. Leaderboard Separation

- [x] 9.0 In the Google Sheet backing the Apps Script endpoint, add a second sheet tab named "CenozoiQuest" — the script now auto-creates it on first write, but you can pre-create it manually
- [x] 9.0b Update the Apps Script to route score reads/writes based on a `game` field in the request body — `scripts/apps-script.gs` updated; paste into Apps Script editor and redeploy
- [x] 9.0c Verify `animal-game/js/config.js` already sends `game: 'animal'` in the score payload (it sets the field, but confirm `scores.js` includes it when calling `saveScore`)
- [ ] 9.0d Test: submit a score from each game and confirm they appear on separate tabs in the sheet

## 10. Verification & Polish

- [x] 9.1 Open `animal-game/index.html` in a browser and play through at least 3 full levels; confirm all 4 question types appear and score/lives/streak tracking works correctly
- [x] 9.2 Test keyboard-only navigation across all question types (including evolved-first and faster)
- [x] 9.3 Verify that at least 10 animals without images fall back gracefully to text-only modes
- [x] 9.4 Confirm that dino game (`index.html`) is completely unaffected — play 1 level to verify no regressions
- [x] 9.5 Check title screen, game-over screen, and browser tab all show "CenozoiQuest" branding
