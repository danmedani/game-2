# Plan: Publish Dino Game to GitHub Pages

## Context
The game is a fully static site (HTML + CSS + JS, no build step) currently running only locally via `make all`. The goal is to publish it publicly so it can be shared via a URL, using GitHub Pages with a private repository.

## Decisions
- **Platform**: GitHub Pages → URL will be `https://jayreddymedani.github.io/game-2/` (or a custom domain later)
- **Repo visibility**: Private (protects the Discord webhook in `config.js`)

## Steps

### 1. Add `.gitignore`
Create `/Users/jayreddymedani/codes/game-2/.gitignore` to exclude things that shouldn't be in the repo:
```
scripts/__pycache__/
*.pyc
.DS_Store
```
Note: `js/dino-data.js` should NOT be gitignored — it's the bundled data the game needs at runtime.

### 2. Push repo to GitHub (private)
- Create a new **private** repo on GitHub named `game-2`
- Add remote: `git remote add origin git@github.com:jayreddymedani/game-2.git`
- Push: `git push -u origin main`

### 3. Enable GitHub Pages
- In the repo Settings → Pages
- Source: **Deploy from a branch**
- Branch: `main`, folder: `/ (root)`
- Save → GitHub will build and provide the URL

### 4. Add `make deploy` target to Makefile
Convenience target to commit and push in one step:
```makefile
deploy:
    git add -A && git commit -m "deploy" && git push
```

### 5. Update `make all` / `make local` with the live URL (optional)
Once the Pages URL is known, could add a `make open` target pointing to it.

## Files to modify
- `Makefile` — add `deploy` target
- `.gitignore` — create new file

## Critical notes
- `js/dino-data.js` must be committed — it's the Wikipedia data bundle the game loads at runtime
- `js/config.js` contains the Discord webhook URL — safe because the repo is private
- No build step needed: GitHub Pages serves the root directory as-is
- The `?dev=1` param works on the live site too — it's not a secret, just not advertised

## Verification
1. After enabling Pages, visit `https://jayreddymedani.github.io/game-2/`
2. Confirm title screen loads and dinos bounce
3. Hit Play and confirm a full game works (dino data loads, questions appear)
4. Share the URL with someone to confirm it's publicly accessible
