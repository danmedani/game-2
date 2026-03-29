## Context

The dino game admin is two files: `admin.html` (static UI) and `scripts/admin-server.py` (local HTTP server that serves static files and handles `POST /api/update` to patch `js/dino-data.js`). The admin is purely a local dev tool — not deployed to GitHub Pages.

CenozoiQuest needs the same pattern: a UI that loads `ANIMALS` + `ANIMAL_DATA` and a server that writes back to `animal-game/js/animal-data.js`.

## Goals / Non-Goals

**Goals:**
- Replicate the dino admin experience for CenozoiQuest animals
- Run locally via `make animal-admin` on a different port (8082) so both admins can run simultaneously
- Theme the UI with CenozoiQuest colors (ocean/earth tones matching `animal-game/style.css`)
- Show extinct/extant badge in sidebar for quick filtering context

**Non-Goals:**
- Merging both admins into one unified tool
- Deploying admin to GitHub Pages
- Editing `animals.js` fields (level, speed, appeared, etc.) — only `animal-data.js` image/description fields

## Decisions

**Fork, don't share** — `animal-game/admin.html` is a direct fork of `admin.html`. No shared JS or templating. Rationale: the two datasets diverge in schema (e.g. `extinct` field), and keeping them independent avoids coupling.

**Port 8082 for animal admin** — dino admin uses 8081. Running on 8082 lets both run simultaneously without conflict.

**Server file path** — `admin-animal-server.py` sets `ANIMAL_DATA_PATH` to `animal-game/js/animal-data.js` and serves static files from the repo root (same as dino server), so relative script paths in `admin.html` resolve correctly.

**Extinct badge in sidebar** — sidebar item meta line shows `Lv N · Extinct` or `Lv N · Extant` instead of just diet, matching the CenozoiQuest game's emphasis on extinct vs. living animals.

## Risks / Trade-offs

[animal-data.js parse fragility] → Same regex approach as dino server (`const ANIMAL_DATA\s*=\s*(\{.*\})`). If the file format changes (e.g. fetch script adds comments mid-object), the regex breaks. Mitigation: keep `fetch-animal-data.py` output format stable; document this dependency.

[No auth on local server] → Both admin servers have no auth and allow CORS `*`. Acceptable for a local-only dev tool; document that it should not be exposed publicly.

## Migration Plan

No migration needed — purely additive new files. `make animal-admin` launches the server; Ctrl-C stops it.
