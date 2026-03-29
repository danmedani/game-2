## Why

DinoQuest's engine is polished and reusable, but its audience is bounded by the niche appeal of prehistoric dinosaurs. A parallel game using Cenozoic and modern animals dramatically broadens appeal — players already know lions, elephants, and dolphins, making it more accessible — while the inclusion of 100 extinct Cenozoic creatures (mammoths, terror birds, saber-toothed cats) keeps the same sense of discovery. Two new question types (who evolved first, who's faster) add variety that suits this animal set better than the existing modes.

## What Changes

- New standalone game variant (`animal-game/`) sharing the same engine code as the dino game, with its own HTML entry point and branding
- New animal dataset: 100 extant animals (top popularly known) + 100 extinct Cenozoic animals, totaling 200 animals with speed, first-appearance date, length/weight, diet, and geography metadata
- New question type: **Evolved First** — given two animals, which appeared earlier in the fossil/evolutionary record?
- New question type: **Who's Faster** — given two animals, which has the higher top speed?
- Data fetch script updated to pull Wikipedia images and summaries for the new animal set
- World themes and map reskinned to reflect Cenozoic eras (Paleogene, Neogene, Quaternary, Modern)

## Capabilities

### New Capabilities
- `animal-dataset`: 200-animal roster (100 modern + 100 extinct Cenozoic) with metadata fields covering speed (km/h), first-appearance (Ma), length (m), diet, geography, and Wikipedia key
- `evolved-first-mode`: Question type presenting two animals; player picks which one appeared first in geological/evolutionary time
- `faster-mode`: Question type presenting two animals; player picks the one with the higher top speed
- `animal-game-shell`: Standalone game entry point (`animal-game/index.html`) wiring the shared engine to the new dataset and question modes, with Cenozoic-era world themes and updated branding

### Modified Capabilities
<!-- No existing spec-level requirements are changing; the dino game is untouched. -->

## Impact

- New directory `animal-game/` with own `index.html`, `style.css` (forked and reskinned), and `js/` (symlinks or copies of shared engine files)
- New `js/animals.js` (analogous to `js/dinos.js`) and auto-generated `js/animal-data.js`
- New `scripts/fetch-animal-data.py` to pull Wikipedia images and descriptions
- Shared `js/game.js` engine should require no structural changes; question-type modules are additive
- `js/scores.js` and `js/config.js` reused as-is or with a namespace prefix
- No changes to the existing dino game files
