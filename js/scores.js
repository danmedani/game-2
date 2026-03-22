// Profanity filter for 3-letter initials
const BAD_INITIALS = new Set([
  'ASS','FUK','FUC','FCK','CUM','DIK','DIX','TIT','FAG','CNT',
  'KKK','NGR','JEW','GAY','SHT','PIS','PUS','SOB','STD','STF',
  'FKU','GFY','WTF','OMG' // last two are fine really but leaving them
].filter(w => ['ASS','FUK','FUC','FCK','CUM','DIK','DIX','TIT','FAG','CNT','KKK','NGR','SHT','PIS'].includes(w)));

function isValidInitials(str) {
  if (!/^[A-Z]{3}$/.test(str)) return false;
  return !BAD_INITIALS.has(str);
}

// Score entry shape: { initials, score, mode, date }
const SCORE_KEY = 'dinoquest_scores';

function getScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY)) || [];
  } catch { return []; }
}

function saveScore(entry) {
  const scores = getScores();
  scores.push({ ...entry, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  // Keep top 100
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(0, 100)));
}

function getTopScores(mode, limit = 10) {
  return getScores()
    .filter(s => !mode || s.mode === mode)
    .slice(0, limit);
}

function getLocalBest(mode) {
  const scores = getTopScores(mode, 1);
  return scores.length ? scores[0].score : 0;
}
