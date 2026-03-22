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

const DIFFICULTY_LEVELS = { easy: [1, 2], medium: [1, 2, 3], hard: [1, 2, 3, 4, 5] };
const DIFFICULTY_MULT   = { easy: 1,      medium: 1.5,        hard: 2 };

function buildPool(difficulty) {
  const levels = DIFFICULTY_LEVELS[difficulty];
  return DINOS.filter(d => levels.includes(d.level));
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
  const mult = DIFFICULTY_MULT[state.difficulty];
  const streakBonus = Math.min(state.streak * 10, 50);
  return Math.round((base + streakBonus) * mult);
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

async function startGame(mode, difficulty) {
  state.mode = mode;
  state.difficulty = difficulty;
  state.score = 0;
  state.lives = 3;
  state.streak = 0;
  state.questionNum = 0;
  state.pool = buildPool(difficulty);
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
  document.getElementById('final-diff').textContent = capitalize(state.difficulty);

  const best = getLocalBest(state.mode, state.difficulty);
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
  saveScore({ initials: raw, score: state.score, mode: state.mode, difficulty: state.difficulty });
  showHighScores(state.mode, state.difficulty);
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

  overlay.innerHTML = `
    <div class="feedback-card ${correct ? 'correct' : 'wrong'}">
      <div class="feedback-icon">${correct ? '✅' : '❌'}</div>
      <div class="feedback-label">${correct ? 'Correct!' : 'Nope!'}</div>
      ${correct ? `<div class="feedback-pts">+${pts} pts</div>` : `<div class="feedback-answer">Answer: ${correctName}</div>`}
      ${factText}
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

function showHighScores(mode, difficulty) {
  showScreen('screen-highscores');
  const scores = getTopScores(mode, difficulty, 10);
  const tbody = document.getElementById('scores-table-body');
  tbody.innerHTML = '';
  if (scores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No scores yet!</td></tr>';
  } else {
    scores.forEach((s, i) => {
      const tr = document.createElement('tr');
      if (i === 0) tr.classList.add('gold');
      if (i === 1) tr.classList.add('silver');
      if (i === 2) tr.classList.add('bronze');
      tr.innerHTML = `<td>${i + 1}. ${s.initials}</td><td>${s.score}</td><td>${capitalize(s.difficulty)}</td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('hs-mode-label').textContent = `${modeName(mode)} — ${capitalize(difficulty)}`;
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

let selectedMode = null;
let selectedDiff = null;

document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-title');

  document.getElementById('btn-play').addEventListener('click', () => showScreen('screen-menu'));
  document.getElementById('btn-scores-title').addEventListener('click', () => {
    showHighScores('name-match', 'easy');
    document.getElementById('hs-back-btn').onclick = () => showScreen('screen-title');
  });

  // Mode selection
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMode = btn.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('btn-to-difficulty').disabled = false;
    });
  });

  document.getElementById('btn-to-difficulty').addEventListener('click', () => {
    if (selectedMode) showScreen('screen-difficulty');
  });
  document.getElementById('btn-menu-back').addEventListener('click', () => showScreen('screen-title'));

  // Difficulty selection
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDiff = btn.dataset.diff;
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('btn-start-game').disabled = false;
    });
  });

  document.getElementById('btn-start-game').addEventListener('click', () => {
    if (selectedMode && selectedDiff) startGame(selectedMode, selectedDiff);
  });
  document.getElementById('btn-diff-back').addEventListener('click', () => showScreen('screen-menu'));

  // In-game
  document.getElementById('btn-quit-game').addEventListener('click', () => {
    if (confirm('Quit this game?')) showScreen('screen-menu');
  });

  // Game over
  document.getElementById('btn-submit-score').addEventListener('click', submitScore);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    startGame(selectedMode, selectedDiff);
  });
  document.getElementById('btn-main-menu').addEventListener('click', () => showScreen('screen-menu'));

  // Initials input: uppercase only, max 3
  const inp = document.getElementById('initials-input');
  inp.addEventListener('input', () => {
    inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitScore();
  });

  // High scores back
  document.getElementById('hs-back-btn').addEventListener('click', () => showScreen('screen-gameover'));
});
