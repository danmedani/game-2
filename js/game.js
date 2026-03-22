// ── Image cache ───────────────────────────────────────────────────────────────
const imageCache = {};

async function fetchWikiImage(wikiTitle) {
  if (imageCache[wikiTitle]) return imageCache[wikiTitle];
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const page = Object.values(data.query.pages)[0];
    const src = page?.thumbnail?.source || null;
    imageCache[wikiTitle] = src;
    return src;
  } catch {
    imageCache[wikiTitle] = null;
    return null;
  }
}

async function preloadImages(dinos) {
  await Promise.all(dinos.map(d => fetchWikiImage(d.wiki)));
}

// ── Fact cache (Wikipedia summary API) ───────────────────────────────────────
const factCache = {};

async function fetchWikiFact(wikiTitle) {
  if (factCache[wikiTitle] !== undefined) return factCache[wikiTitle];
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const res = await fetch(url);
    const data = await res.json();
    // Take the first sentence of the plain-text extract
    const extract = data.extract || '';
    const first = extract.match(/[^.!?]*[.!?]/)?.[0]?.trim() || extract.slice(0, 160).trim();
    factCache[wikiTitle] = first;
    return first;
  } catch {
    factCache[wikiTitle] = '';
    return '';
  }
}

async function preloadFacts(dinos) {
  await Promise.all(dinos.map(d => fetchWikiFact(d.wiki)));
}

// ── Keyboard navigation ───────────────────────────────────────────────────────
let focusedOptionIndex = -1;

function getOptionButtons() {
  return Array.from(document.querySelectorAll('#question-area [data-name]'));
}

function applyKeyboardFocus(buttons) {
  buttons.forEach((btn, i) => {
    btn.classList.toggle('keyboard-focus', i === focusedOptionIndex);
  });
}

function resetKeyboardFocus() {
  focusedOptionIndex = 0;
  applyKeyboardFocus(getOptionButtons());
}

// All question layouts use 2 columns
const GRID_COLS = 2;

function gridMove(index, direction, total) {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  const maxRow = Math.floor((total - 1) / GRID_COLS);

  if (direction === 'right' && col < GRID_COLS - 1 && index + 1 < total) return index + 1;
  if (direction === 'left'  && col > 0)                                   return index - 1;
  if (direction === 'down'  && row < maxRow && index + GRID_COLS < total) return index + GRID_COLS;
  if (direction === 'up'    && row > 0)                                   return index - GRID_COLS;
  return null;
}

function jiggleFocused(buttons) {
  const btn = buttons[focusedOptionIndex];
  if (!btn) return;
  btn.classList.add('keyboard-jiggle');
  btn.addEventListener('animationend', () => btn.classList.remove('keyboard-jiggle'), { once: true });
}

// ── Game state ────────────────────────────────────────────────────────────────
let state = {
  mode: null,        // 'name-match' | 'pic-match' | 'size-battle' | 'dino-facts'
  difficulty: null,  // 'easy' | 'medium' | 'hard'
  score: 0,
  lives: 3,
  streak: 0,
  questionNum: 0,
  totalQuestions: 10,
  pool: [],
  currentQ: null,
  answeredThisRound: false,
  usedCorrects: new Set(), // tracks every correct answer used this game — no repeats
};

const SCORE_MULT = 1.5;

function buildPool() {
  return [...DINOS];
}

function pick(arr, n) {
  const copy = [...arr];
  const result = [];
  while (result.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(i, 1)[0]);
  }
  return result;
}

function calcPoints(correct) {
  if (!correct) return 0;
  const base = 100;
  const streakBonus = Math.min(state.streak * 10, 50);
  return Math.round((base + streakBonus) * SCORE_MULT);
}

// ── Question builders ─────────────────────────────────────────────────────────

function pickFreshCorrect() {
  const fresh = state.pool.filter(d => !state.usedCorrects.has(d.name));
  const candidates = fresh.length >= 1 ? fresh : state.pool; // fallback if pool exhausted
  const [correct] = pick(candidates, 1);
  state.usedCorrects.add(correct.name);
  return correct;
}

function buildNameMatchQuestion() {
  const correct = pickFreshCorrect();
  const wrongs = pick(state.pool.filter(d => d.name !== correct.name), 3);
  const options = pick([correct, ...wrongs], 4); // shuffled
  return { type: 'name-match', correct, options, imgSrc: imageCache[correct.wiki] };
}

function buildPicMatchQuestion() {
  const correct = pickFreshCorrect();
  const wrongs = pick(state.pool.filter(d => d.name !== correct.name), 3);
  const options = pick([correct, ...wrongs], 4);
  return { type: 'pic-match', correct, options };
}

function buildSizeBattleQuestion() {
  const fresh = state.pool.filter(d => !state.usedCorrects.has(d.name));
  const [a, b] = pick(fresh.length >= 2 ? fresh : state.pool, 2);
  state.usedCorrects.add(a.name);
  state.usedCorrects.add(b.name);
  const bigger = a.length >= b.length ? a : b;
  return { type: 'size-battle', a, b, bigger };
}

function buildDinoFactsQuestion() {
  const correct = pickFreshCorrect();
  const wrongs = pick(state.pool.filter(d => d.name !== correct.name), 3);
  const options = pick([correct, ...wrongs], 4);
  const fact = factCache[correct.wiki] || `A fascinating dinosaur — ${correct.name}!`;
  return { type: 'dino-facts', correct, options, fact };
}

async function nextQuestion() {
  state.answeredThisRound = false;
  state.questionNum++;

  let q;
  switch (state.mode) {
    case 'name-match':  q = buildNameMatchQuestion(); break;
    case 'pic-match':   q = buildPicMatchQuestion();  break;
    case 'size-battle': q = buildSizeBattleQuestion(); break;
    case 'dino-facts':  q = buildDinoFactsQuestion();  break;
  }
  state.currentQ = q;
  await renderQuestion(q);
}

// ── Game flow ─────────────────────────────────────────────────────────────────

async function startGame(mode) {
  state.mode = mode;
  state.score = 0;
  state.lives = 3;
  state.streak = 0;
  state.questionNum = 0;
  state.pool = buildPool();
  state.usedCorrects = new Set();

  showScreen('screen-loading');
  setLoadingMessage('Fetching dinosaur images & facts...');

  // Preload images and facts for a subset used in this session
  const sessionDinos = pick(state.pool, Math.min(30, state.pool.length));
  await Promise.all([preloadImages(sessionDinos), preloadFacts(sessionDinos)]);
  // Use only dinos that have images (for image modes)
  if (mode === 'name-match' || mode === 'pic-match') {
    state.pool = state.pool.filter(d => imageCache[d.wiki]);
    if (state.pool.length < 4) {
      alert('Could not load enough dinosaur images. Check your connection!');
      showScreen('screen-menu');
      return;
    }
  }

  showScreen('screen-game');
  updateHUD();
  await nextQuestion();
}

async function handleAnswer(chosen) {
  if (state.answeredThisRound) return;
  state.answeredThisRound = true;

  const q = state.currentQ;
  let correct = false;

  if (q.type === 'name-match' || q.type === 'dino-facts') {
    correct = chosen.name === q.correct.name;
  } else if (q.type === 'pic-match') {
    correct = chosen.name === q.correct.name;
  } else if (q.type === 'size-battle') {
    correct = chosen.name === q.bigger.name;
  }

  if (correct) {
    state.streak++;
    const pts = calcPoints(true);
    state.score += pts;
    showFeedback(true, pts, q);
  } else {
    state.streak = 0;
    state.lives--;
    showFeedback(false, 0, q);
  }

  updateHUD();

  await waitForFeedbackDismiss();

  if (state.lives <= 0 || state.questionNum >= state.totalQuestions) {
    endGame();
  } else {
    await nextQuestion();
  }
}

function endGame() {
  showScreen('screen-gameover');
  document.getElementById('final-score').textContent = state.score;
  document.getElementById('final-mode').textContent = modeName(state.mode);

  const best = getLocalBest(state.mode);
  const isHigh = state.score > best;
  document.getElementById('highscore-msg').textContent = isHigh
    ? '🏆 New Local High Score!'
    : `Local Best: ${best}`;

  document.getElementById('initials-input').value = '';
  document.getElementById('initials-error').textContent = '';
}

function submitScore() {
  const raw = document.getElementById('initials-input').value.toUpperCase().trim();
  if (!isValidInitials(raw)) {
    document.getElementById('initials-error').textContent =
      raw.length !== 3 ? 'Enter exactly 3 letters.' : 'Choose different initials!';
    return;
  }
  saveScore({ initials: raw, score: state.score, mode: state.mode });
  showHighScores(state.mode);
}

// ── Render ────────────────────────────────────────────────────────────────────

function updateHUD() {
  document.getElementById('hud-score').textContent = state.score;
  document.getElementById('hud-q').textContent = `${state.questionNum}/${state.totalQuestions}`;
  const hearts = document.getElementById('hud-lives');
  hearts.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.textContent = i < state.lives ? '❤️' : '🖤';
    hearts.appendChild(span);
  }
  if (state.streak >= 2) {
    document.getElementById('hud-streak').textContent = `🔥 x${state.streak}`;
  } else {
    document.getElementById('hud-streak').textContent = '';
  }
}

async function renderQuestion(q) {
  const area = document.getElementById('question-area');
  area.innerHTML = '';

  if (q.type === 'name-match') {
    area.innerHTML = `
      <p class="question-prompt">Which dinosaur is this?</p>
      <div class="dino-image-wrap">
        <img src="${q.imgSrc}" alt="mystery dinosaur" class="dino-img" onerror="this.src='img/dino-placeholder.svg'"/>
      </div>
      <div class="options grid-2">
        ${q.options.map(d => `
          <button class="option-btn" onclick="handleAnswer(DINOS.find(x=>x.name===this.dataset.name))" data-name="${d.name}">${d.name}</button>
        `).join('')}
      </div>`;
  } else if (q.type === 'pic-match') {
    // preload images for options
    await preloadImages(q.options);
    area.innerHTML = `
      <p class="question-prompt">Find the picture of: <strong>${q.correct.name}</strong></p>
      <div class="options grid-2 pic-grid">
        ${q.options.map(d => {
          const src = imageCache[d.wiki] || '';
          return `<button class="option-btn pic-btn" onclick="handleAnswer(DINOS.find(x=>x.name===this.dataset.name))" data-name="${d.name}">
            <img src="${src}" alt="${d.name}" onerror="this.src='img/dino-placeholder.svg'"/>
            </button>`;
        }).join('')}
      </div>`;
  } else if (q.type === 'size-battle') {
    const imgA = imageCache[q.a.wiki];
    const imgB = imageCache[q.b.wiki];
    area.innerHTML = `
      <p class="question-prompt">Which dinosaur was <strong>BIGGER</strong>?</p>
      <div class="size-battle-wrap">
        <button class="size-card" onclick="handleAnswer(DINOS.find(x=>x.name===this.dataset.name))" data-name="${q.a.name}">
          ${imgA ? `<img src="${imgA}" alt="${q.a.name}"/>` : '<div class="no-img">?</div>'}
          <span class="size-name">${q.a.name}</span>
        </button>
        <div class="vs-badge">VS</div>
        <button class="size-card" onclick="handleAnswer(DINOS.find(x=>x.name===this.dataset.name))" data-name="${q.b.name}">
          ${imgB ? `<img src="${imgB}" alt="${q.b.name}"/>` : '<div class="no-img">?</div>'}
          <span class="size-name">${q.b.name}</span>
        </button>
      </div>`;
  } else if (q.type === 'dino-facts') {
    area.innerHTML = `
      <p class="question-prompt">Which dinosaur is being described?</p>
      <div class="fact-box">"${q.fact}"</div>
      <div class="options grid-2">
        ${q.options.map(d => `
          <button class="option-btn" onclick="handleAnswer(DINOS.find(x=>x.name===this.dataset.name))" data-name="${d.name}">${d.name}</button>
        `).join('')}
      </div>`;
  }

  // Wire up button clicks properly (replace inline onclick with event listeners)
  area.querySelectorAll('[data-name]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dino = DINOS.find(x => x.name === btn.dataset.name);
      if (dino) handleAnswer(dino);
    });
    // Remove inline onclick
    btn.removeAttribute('onclick');
  });

  resetKeyboardFocus();
}

function getSizeLevel(m) {
  if (m <  1)  return { level: 1, label: 'Tiny' };
  if (m <  4)  return { level: 2, label: 'Small' };
  if (m < 10)  return { level: 3, label: 'Medium' };
  if (m < 20)  return { level: 4, label: 'Large' };
  return              { level: 5, label: 'Enormous' };
}

function parseMidMa(period) {
  const m = period.match(/\(~?(\d+)(?:[–\-](\d+))?\s*Ma\)/);
  if (!m) return null;
  const a = parseInt(m[1]), b = m[2] ? parseInt(m[2]) : a;
  return (a + b) / 2;
}

function getGeoGlobes(geo) {
  const g = geo.toLowerCase();
  const out = new Set();
  if (g.includes('north america') || g.includes('south america')) out.add('🌎');
  if (g.includes('europe') || g.includes('africa'))               out.add('🌍');
  if (g.includes('asia'))                                          out.add('🌏');
  if (g.includes('ocean') || g.includes('worldwide'))             out.add('🌊');
  return [...out].join(' ');
}

function dinoInfoHTML(dino) {
  const ft = (dino.length * 3.281).toFixed(1);

  // ── Size-o-meter ──
  const { level, label: sizeLabel } = getSizeLevel(dino.length);
  const pips = Array.from({ length: 5 }, (_, i) =>
    `<span class="sizo-pip ${i < level ? 'on' : 'off'}"></span>`
  ).join('');

  // ── Period timeline ──
  // Triassic 252–201 Ma (51), Jurassic 201–145 Ma (56), Cretaceous 145–66 Ma (79). Total 186.
  const periodName  = dino.period.replace(/\s*\([^)]*\)/, '').trim();
  const periodDates = dino.period.match(/\(([^)]+)\)/)?.[1] ?? '';
  const midMa       = parseMidMa(dino.period) ?? 100;
  const markerPct   = Math.min(100, Math.max(0, (252 - midMa) / 186 * 100)).toFixed(1);

  // ── Geography globes ──
  const globes = getGeoGlobes(dino.geo);

  return `
    <div class="feedback-info">
      <div class="feedback-info-item full">
        <div class="fi-row"><span class="fi-emoji">🕐</span><span class="fi-main">${periodName}</span></div>
        <div class="fi-sub">${periodDates}</div>
        <div class="period-bar-wrap">
          <div class="period-bar">
            <div class="pt-t"></div><div class="pt-j"></div><div class="pt-c"></div>
          </div>
          <div class="period-marker" style="left:${markerPct}%"></div>
        </div>
        <div class="pt-labels"><span>Triassic</span><span>Jurassic</span><span>Cretaceous</span></div>
      </div>
      <div class="feedback-info-item">
        <div class="fi-row"><span class="fi-emoji">📏</span><span class="fi-main">${dino.length}m</span></div>
        <div class="fi-sub">${ft}ft</div>
        <div class="sizometer">${pips}<span class="sizo-label">${sizeLabel}</span></div>
      </div>
      <div class="feedback-info-item">
        <div class="fi-row"><span class="fi-emoji">🍖</span><span class="fi-main">${dino.diet}</span></div>
      </div>
      <div class="feedback-info-item full">
        <div class="fi-row"><span class="fi-emoji">📍</span><span class="fi-main">${dino.geo}</span><span class="fi-globes">${globes}</span></div>
      </div>
    </div>`;
}

function showFeedback(correct, pts, q) {
  const overlay = document.getElementById('feedback-overlay');
  let correctName = '';
  if (q.type === 'size-battle') {
    correctName = q.bigger.name;
  } else {
    correctName = q.correct.name;
  }

  let factText = '';
  if (q.type !== 'size-battle') {
    const fact = factCache[q.correct.wiki] || '';
    factText = fact ? `<p class="feedback-fact">${fact}</p>` : '';
  } else {
    const bigger = q.bigger;
    const smaller = bigger.name === q.a.name ? q.b : q.a;
    factText = `<p class="feedback-fact">${bigger.name}: ${bigger.length}m long<br>${smaller.name}: ${smaller.length}m long</p>`;
  }

  const infoDino = q.type === 'size-battle' ? q.bigger : q.correct;
  const infoHTML = dinoInfoHTML(infoDino);

  overlay.innerHTML = `
    <div class="feedback-card ${correct ? 'correct' : 'wrong'}">
      <div class="feedback-icon">${correct ? '✅' : '❌'}</div>
      <div class="feedback-label">${correct ? 'Correct!' : 'Nope!'}</div>
      ${correct ? `<div class="feedback-pts">+${pts} pts</div>` : `<div class="feedback-answer">Answer: ${correctName}</div>`}
      ${factText}
      ${infoHTML}
      <div class="feedback-tap-hint">tap to continue</div>
    </div>`;
  overlay.classList.add('active');

  // Highlight buttons
  document.querySelectorAll('[data-name]').forEach(btn => {
    if (btn.dataset.name === correctName) btn.classList.add('correct-highlight');
    else btn.classList.add('wrong-dim');
  });
}

function hideFeedback() {
  document.getElementById('feedback-overlay').classList.remove('active');
  document.getElementById('feedback-overlay').innerHTML = '';
}

function waitForFeedbackDismiss() {
  return new Promise(resolve => {
    const overlay = document.getElementById('feedback-overlay');
    function onClick() {
      overlay.removeEventListener('click', onClick);
      hideFeedback();
      resolve();
    }
    overlay.addEventListener('click', onClick);
  });
}

function showHighScores(mode) {
  showScreen('screen-highscores');
  const scores = getTopScores(mode, 10);
  const tbody = document.getElementById('scores-table-body');
  tbody.innerHTML = '';
  if (scores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center">No scores yet!</td></tr>';
  } else {
    scores.forEach((s, i) => {
      const tr = document.createElement('tr');
      if (i === 0) tr.classList.add('gold');
      if (i === 1) tr.classList.add('silver');
      if (i === 2) tr.classList.add('bronze');
      tr.innerHTML = `<td>${i + 1}. ${s.initials}</td><td>${s.score}</td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('hs-mode-label').textContent = modeName(mode);
}

// ── Screens ───────────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setLoadingMessage(msg) {
  document.getElementById('loading-msg').textContent = msg;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function modeName(m) {
  return { 'name-match': 'Name Match', 'pic-match': 'Picture Match', 'size-battle': 'Size Battle', 'dino-facts': 'Dino Facts' }[m] || m;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  const overlay = document.getElementById('feedback-overlay');

  // Dismiss feedback modal
  if (overlay.classList.contains('active')) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      overlay.click();
    }
    return;
  }

  // Only handle arrow/confirm keys during an active question
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  if (state.answeredThisRound) return;

  const buttons = getOptionButtons();
  if (!buttons.length) return;

  const dirMap = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' };
  const dir = dirMap[e.key];

  if (dir) {
    e.preventDefault();
    const next = gridMove(focusedOptionIndex, dir, buttons.length);
    if (next !== null) {
      focusedOptionIndex = next;
      applyKeyboardFocus(buttons);
    } else {
      jiggleFocused(buttons);
    }
  } else if (e.key === ' ' || e.key === 'Enter') {
    if (focusedOptionIndex >= 0 && focusedOptionIndex < buttons.length) {
      e.preventDefault();
      buttons[focusedOptionIndex].click();
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-title');

  // Title screen
  document.getElementById('btn-play').addEventListener('click', () => startGame('name-match'));
  document.getElementById('btn-scores-title').addEventListener('click', () => {
    showHighScores('name-match');
    document.getElementById('hs-back-btn').onclick = () => showScreen('screen-title');
  });

  // Mode select — each card directly starts the game
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.mode));
  });

  // In-game
  document.getElementById('btn-quit-game').addEventListener('click', () => {
    if (confirm('Quit this game?')) showScreen('screen-menu');
  });

  // Game over
  document.getElementById('btn-submit-score').addEventListener('click', submitScore);
  document.getElementById('btn-play-again').addEventListener('click', () => showScreen('screen-menu'));
  document.getElementById('btn-main-menu').addEventListener('click', () => showScreen('screen-title'));

  // Initials input: uppercase only, max 3
  const inp = document.getElementById('initials-input');
  inp.addEventListener('input', () => {
    inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitScore();
  });

  // High scores back
  document.getElementById('hs-back-btn').addEventListener('click', () => showScreen('screen-menu'));
});
