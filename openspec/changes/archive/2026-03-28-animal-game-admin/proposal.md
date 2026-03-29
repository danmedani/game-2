## Why

The dino game has a local admin UI (`admin.html` + `scripts/admin-server.py`) for browsing and editing animal images and descriptions, but CenozoiQuest has no equivalent. Without it, fixing broken image URLs or improving descriptions in `animal-game/js/animal-data.js` requires hand-editing JSON, which is error-prone.

## What Changes

- New `animal-game/admin.html` — admin UI mirroring `admin.html`, but wired to `ANIMALS` / `ANIMAL_DATA` with CenozoiQuest theming (ocean/earth tones)
- New `scripts/admin-animal-server.py` — local dev server mirroring `scripts/admin-server.py`, serving from `animal-game/` and writing back to `animal-game/js/animal-data.js`
- New `make animal-admin` Makefile target to launch the server

## Capabilities

### New Capabilities
- `animal-admin`: Local admin UI and server for browsing and editing CenozoiQuest animal data (images, short/full descriptions)

### Modified Capabilities
<!-- none -->

## Impact

- New files: `animal-game/admin.html`, `scripts/admin-animal-server.py`
- Modified: `Makefile` (new target)
- No changes to the game itself or any shared files
