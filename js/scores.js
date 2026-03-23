// Profanity filter for 3-letter initials
const BAD_INITIALS = new Set([
  'ASS','FUK','FUC','FCK','CUM','DIK','DIX','TIT','FAG','CNT',
  'KKK','NGR','SHT','PIS',
].filter(w => w)); // explicit list only

function isValidInitials(str) {
  if (!/^[A-Z]{3}$/.test(str)) return false;
  return !BAD_INITIALS.has(str);
}

// Score entry shape: { initials, score, date }
const SCORE_KEY = 'dinoquest_scores';

// ── Local (localStorage) ──────────────────────────────────────────────────────

function getLocalScores() {
  try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || []; }
  catch { return []; }
}

function saveLocalScore(entry) {
  const scores = getLocalScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(0, 100)));
}

function getLocalBest() {
  const s = getLocalScores();
  return s.length ? s[0].score : 0;
}

// ── Global (Google Sheet via Apps Script) ─────────────────────────────────────

function scoresUrl() {
  return (typeof CONFIG !== 'undefined') && CONFIG.scoresUrl;
}

async function saveScore(entry) {
  const fullEntry = { ...entry, date: new Date().toISOString() };
  saveLocalScore(fullEntry);

  const url = scoresUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method:  'POST',
      body:    JSON.stringify(fullEntry),
    });
  } catch (e) {
    console.warn('Score post failed:', e);
  }
}

// Returns top 10 global scores, falls back to local if unavailable
async function getTopScores(limit = 10) {
  const url = scoresUrl();
  if (url) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`); // bust cache
      if (res.ok) {
        const global = await res.json();
        if (Array.isArray(global)) return global.slice(0, limit);
      }
    } catch (e) {
      console.warn('Score fetch failed, using local:', e);
    }
  }
  return getLocalScores().slice(0, limit);
}
