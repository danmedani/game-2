## ADDED Requirements

### Requirement: Standalone game entry point
The system SHALL provide a standalone game at `animal-game/index.html` that is independently loadable as a static web page with no dependency on the dino game's files.

`animal-game/` SHALL contain:
- `index.html` — game HTML (forked from the dino game's `index.html`, rebranded)
- `style.css` — reskinned CSS (forked from dino game, Cenozoic color palette)
- `js/animals.js` — animal roster (new)
- `js/animal-data.js` — auto-generated Wikipedia data (new)
- `js/game.js` — engine copy (copied from dino game, with animal-specific mode list)
- `js/scores.js` — score management (copied, namespace-prefixed for localStorage keys)
- `js/config.js` — configuration (copied, pointing to a separate leaderboard sheet)

#### Scenario: Standalone load
- **WHEN** a browser opens `animal-game/index.html` directly
- **THEN** the full game SHALL load and be playable without any files from the parent dino game directory

#### Scenario: No cross-contamination of scores
- **WHEN** a player submits a score in the animal game
- **THEN** the score SHALL be stored under a different localStorage key than the dino game scores (e.g., `animalHighScores` vs `highScores`)

### Requirement: Cenozoic world themes
The animal game's 11 world themes SHALL use Cenozoic epoch names and appropriate color palettes instead of the dino game's Mesozoic themes.

World theme sequence SHALL be:
1. Paleocene Wilds
2. Eocene Jungles
3. Oligocene Steppes
4. Miocene Savannas
5. Pliocene Grasslands
6. Ice Age Tundra (Pleistocene)
7. Holocene Dawn
8. Modern Savanna
9. Deep Ocean
10. Frozen Arctic
11. Ancient Rainforest

Each world SHALL have a distinct primary color, secondary color, and emoji motif appropriate to its era/biome.

#### Scenario: World theme progression
- **WHEN** a player completes levels 1–5 (World 1)
- **THEN** the map screen SHALL display "Paleocene Wilds" theming with appropriate colors

#### Scenario: Modern worlds
- **WHEN** a player reaches World 8 (Modern Savanna) or beyond
- **THEN** the theme SHALL reflect a modern biome rather than a geological epoch

### Requirement: Animal game mode sequence
The animal game SHALL use the mode sequence `['name-match', 'evolved-first', 'faster', 'pic-match']` as its primary `ALL_MODES` list, with a `MODE_SEQUENCE_NO_IMAGES` fallback of `['evolved-first', 'faster', 'evolved-first', 'faster', 'evolved-first']`.

#### Scenario: Mode rotation
- **WHEN** questions are generated for any level
- **THEN** the mode type SHALL rotate through `ALL_MODES` based on `(level + questionNum) % ALL_MODES.length`, matching the existing engine rotation logic

#### Scenario: No-images fallback
- **WHEN** fewer than 4 animals in the current pool have images
- **THEN** the game SHALL fall back to `MODE_SEQUENCE_NO_IMAGES` for that level

### Requirement: Extinct indicator in answer feedback
The animal game SHALL visually distinguish extinct animals from living animals in answer feedback cards.

#### Scenario: Extinct animal feedback
- **WHEN** an answer card is shown for an extinct animal (`extinct: true`)
- **THEN** a small skull icon (💀) or "Extinct" label SHALL appear on the card alongside the animal's name

#### Scenario: Extant animal feedback
- **WHEN** an answer card is shown for a living animal (`extinct: false`)
- **THEN** no extinct indicator SHALL be shown; optionally a "Still alive today!" note may appear for context

### Requirement: Game branding
The animal game SHALL be titled **"CenozoiQuest"** (or similar Cenozoic-themed name) in the `<title>` tag, title screen heading, and game-over screen. It SHALL NOT use "DinoQuest" branding.

#### Scenario: Title screen branding
- **WHEN** `animal-game/index.html` is opened
- **THEN** the page title and on-screen heading SHALL read "CenozoiQuest" (not "DinoQuest")

### Requirement: Facts page shown reliably after every answer
After a player selects an answer, the game SHALL always display the facts/answer view and SHALL wait for an explicit player dismissal before advancing to the next question. The dismissal listener SHALL be installed in a way that cannot race with the answer-triggering interaction or with DOM clearing in `renderQuestion()`.

The implementation SHALL use `requestAnimationFrame` (or equivalent post-paint guarantee) to mark the dismiss listener as active, ensuring:
1. The facts view is fully rendered and painted before any click can dismiss it
2. The click that triggered the answer cannot accidentally also dismiss the facts view
3. `renderQuestion()` cannot clear the facts DOM before the player has dismissed

#### Scenario: Facts always shown
- **WHEN** a player selects any answer option
- **THEN** the facts/answer view SHALL be displayed before the next question renders, every time without exception

#### Scenario: Player must dismiss
- **WHEN** the facts view is displayed
- **THEN** the next question SHALL NOT render until the player clicks or taps to dismiss

#### Scenario: Answer click does not auto-dismiss
- **WHEN** a player clicks an answer option
- **THEN** that same click SHALL NOT count as a dismissal of the facts view that immediately follows

#### Scenario: Keyboard dismiss still works
- **WHEN** the facts view is displayed and the player presses Space or Enter
- **THEN** the facts view SHALL be dismissed and the next question SHALL load
