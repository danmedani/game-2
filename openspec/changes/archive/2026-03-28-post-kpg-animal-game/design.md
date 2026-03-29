## Context

DinoQuest is a working vanilla-JS quiz engine with 4 question types, a level/world progression system, a Wikipedia data pipeline, and cloud leaderboards. The goal is to ship a second game — **CenozoiQuest** — that reuses this engine wholesale but swaps in a Cenozoic/modern animal dataset and adds two new question types suited to that dataset. The dino game must remain unmodified.

The engine lives in `js/game.js` (1,219 lines). Question types are registered in an `ALL_MODES` array and built by dedicated `buildXxxQuestion()` functions. Adding a new type means appending to that array and adding a builder — no structural surgery required.

## Goals / Non-Goals

**Goals:**
- Deliver a playable alternate game at `animal-game/index.html` sharing the existing engine
- Define 200-animal dataset (100 modern, 100 extinct Cenozoic) with all metadata needed by existing + new question types
- Implement `evolved-first` question type (which animal appeared earlier)
- Implement `faster` question type (which animal has the higher top speed)
- Provide a data-fetch script for Wikipedia images + descriptions for the new animal set
- Apply a Cenozoic-themed visual skin (world names, color palette, branding)

**Non-Goals:**
- Modifying or breaking any existing dino game files
- Multiplayer or real-time features
- Mobile-native app packaging
- Adding new question types to the dino game

## Decisions

### D1 — File layout: fork entry point, symlink/copy shared engine

**Decision:** `animal-game/` contains its own `index.html` and `style.css` (reskinned fork). Engine files (`game.js`, `scores.js`, `config.js`) are copied (not symlinked) to keep the two games independently deployable as static sites.

**Alternatives considered:**
- *Single `index.html` with a `?game=animals` query param* — simpler but couples both games into one file, harder to theme, adds branching noise to the engine.
- *Symlinks* — elegant for development but breaks on many static hosts (GitHub Pages, Netlify) without extra config.

**Rationale:** Copy + reskin is the safest static-site approach and matches how the original game is already structured.

---

### D2 — New question types are additive to `ALL_MODES`

**Decision:** `evolved-first` and `faster` are implemented as additional entries in `ALL_MODES` (and a new `MODE_SEQUENCE` array for the animal game). Each has its own `buildEvolvedFirstQuestion()` / `buildFasterQuestion()` builder function following the existing pattern.

**Alternatives considered:**
- *Separate mode-selection screen* — adds scope; can be layered on later.
- *Replacing size-battle with faster* — would lose generality; better to keep both modes available.

**Rationale:** Zero engine changes, maximum reuse. The animal game's mode sequence will be `['name-match', 'evolved-first', 'faster', 'pic-match']` replacing `size-battle` and `dino-facts` with the two new types.

---

### D3 — Animal metadata stored in `js/animals.js` mirroring `js/dinos.js`

**Decision:** Each animal record carries: `name`, `wiki`, `level` (1–5), `length` (m), `speed` (km/h top speed), `appeared` (Ma, millions of years ago — negative for modern species use 0.0001), `period`, `diet`, `geo`, `extinct` (bool).

**Alternatives considered:**
- *Separate files for modern vs extinct* — unnecessary split; the `extinct` flag handles filtering if needed.
- *Speed as a range* — a single representative top speed is sufficient for a quiz comparison; ranges add ambiguity.

**Rationale:** Single flat array, same shape as `dinos.js`, minimal engine changes. The `appeared` field enables `evolved-first`; `speed` enables `faster`.

---

### D4 — Wikipedia data pipeline reused with a new script

**Decision:** `scripts/fetch-animal-data.py` mirrors `fetch-dino-data.py`, writing to `animal-game/js/animal-data.js`. The Makefile gets a new `fetch-animal-data` target.

**Rationale:** The existing pipeline already handles rate-limiting, image extraction, and short/full fact generation. No need to reinvent it.

---

### D5 — World themes use Cenozoic era names

**Decision:** The 11 world themes are renamed to geological epochs: Paleocene, Eocene, Oligocene, Miocene, Pliocene, Pleistocene, Holocene, and 4 modern biome worlds (Savanna, Ocean, Arctic, Rainforest). Color palettes shift from warm Mesozoic reds/oranges toward cooler greens, blues, and tans reflecting grasslands, oceans, and ice ages.

**Rationale:** Consistent with the game's educational theme; gives players implicit exposure to geological time.

## Risks / Trade-offs

- **Speed data accuracy** → Many species have disputed or context-dependent top speeds. Mitigation: use widely-cited figures from Wikipedia/established sources; add a brief "did you know" note in the answer feedback acknowledging variability.
- **`appeared` (Ma) precision for modern animals** → Living species have an evolutionary first-appearance date that is often debated. Mitigation: use the earliest fossil record date from Wikipedia; document source in the data file comments.
- **Engine copy drift** → If `game.js` is improved in the dino game, the animal game copy diverges. Mitigation: document in the Makefile that animal-game engine files should be re-synced on significant dino-game engine updates.
- **200-animal image availability** → Some lesser-known Cenozoic animals may lack high-quality Wikipedia images. Mitigation: `dino-facts`-style text fallback already exists in the engine; the same fallback will apply here via `MODE_SEQUENCE_NO_IMAGES`.

## Open Questions

- Should the animal game share the same Google Sheets leaderboard as the dino game, or have its own? (Recommend: separate sheet, same Apps Script endpoint with a `game` parameter — low effort, clean separation.)
- Should extinct Cenozoic animals be visually distinguished from modern animals in the UI (e.g., a small skull icon)? (Recommend: yes, small indicator in the answer card — adds educational value.)
