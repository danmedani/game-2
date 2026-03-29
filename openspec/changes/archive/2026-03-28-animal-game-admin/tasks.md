## 1. Server

- [x] 1.1 Create `scripts/admin-animal-server.py` by forking `scripts/admin-server.py` — update `ANIMAL_DATA_PATH` to `animal-game/js/animal-data.js`, rename all `dino`/`DINO` references to `animal`/`ANIMAL`, and change `PORT` to `8082`
- [x] 1.2 Update the startup print message to output `http://localhost:8082/animal-game/admin.html`

## 2. Makefile

- [x] 2.1 Add `animal-admin` target to `Makefile` that runs `python3 scripts/admin-animal-server.py`

## 3. Admin UI

- [x] 3.1 Create `animal-game/admin.html` by forking `admin.html` — update `<title>` to "Animal Admin", header emoji/text to "🦣 Animal Admin", and script tags to load `animals.js` and `animal-data.js` from the same directory
- [x] 3.2 Update the CSS color palette to CenozoiQuest ocean/earth tones (match `animal-game/style.css` variables: `--bg: #1a2535`, `--accent: #5bb8d4`, etc.)
- [x] 3.3 Replace all `DINOS`/`DINO_DATA` JS references with `ANIMALS`/`ANIMAL_DATA`
- [x] 3.4 Update sidebar item meta line to show `Lv N · Extinct` or `Lv N · Extant` (using `animal.extinct`) instead of diet
- [x] 3.5 Update the editor detail line to show `wiki key: <code>…</code> · Level N · {period}` (same as dino admin, just sourced from `animal` object)
- [x] 3.6 Update the empty-state emoji from 🦖 to 🦣 and text from "Select a dino to edit" to "Select an animal to edit"
- [x] 3.7 Update filter input placeholder from "Filter dinos…" to "Filter animals…"

## 4. Verification

- [ ] 4.1 Run `make animal-admin` and open `http://localhost:8082/animal-game/admin.html` — confirm sidebar loads all 200 animals
- [ ] 4.2 Select an animal, edit the image URL, click Preview — confirm image updates
- [ ] 4.3 Save a change — confirm `animal-game/js/animal-data.js` is updated on disk
- [ ] 4.4 Confirm dino admin still works unaffected (`make admin`)
