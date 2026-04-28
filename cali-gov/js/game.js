// ── Data (loaded once, cached) ────────────────────────────────────────────────
let QUESTIONS  = null;   // from questions.json
let CANDIDATES = null;   // from candidates/index.json

// ── Planet image per question (Q1=Mercury → Q10=Sun) ─────────────────────────
const PLANET_IMGS = [
  { file: 'mercury.jpg',  name: 'Mercury'  },
  { file: 'venus.jpeg',   name: 'Venus'    },
  { file: 'earth.jpg',    name: 'Earth'    },
  { file: 'mars.png',     name: 'Mars'     },
  { file: 'jupiter.png',  name: 'Jupiter'  },
  { file: 'saturn.jpg',   name: 'Saturn'   },
  { file: 'uranus.png',   name: 'Uranus'   },
  { file: 'neptune.png',  name: 'Neptune'  },
  { file: 'pluto.jpg',    name: 'Pluto'    },
  { file: 'sun.jpg',      name: 'The Sun'  },
];

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  questionIndex:    0,
  answers:          [],   // array of -10/-5/0/5/10
  answeredThisRound: false,
  sortedResults:    null, // filled after quiz
};

// ── Keyboard nav ──────────────────────────────────────────────────────────────
let focusedOptionIndex = -1;

function getOptionButtons() {
  return Array.from(document.querySelectorAll('#question-area [data-value]'));
}

function applyKeyboardFocus(buttons) {
  buttons.forEach((btn, i) => btn.classList.toggle('keyboard-focus', i === focusedOptionIndex));
}

function resetKeyboardFocus() {
  focusedOptionIndex = -1;
  applyKeyboardFocus(getOptionButtons());
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadData() {
  const [qRes, cRes] = await Promise.all([
    fetch('questions.json'),
    fetch('candidates/index.json'),
  ]);
  if (!qRes.ok || !cRes.ok) throw new Error('Failed to load data');
  QUESTIONS  = await qRes.json();
  CANDIDATES = await cRes.json();
}

// ── Game flow ─────────────────────────────────────────────────────────────────
async function startGame() {
  if (!QUESTIONS || !CANDIDATES) {
    showScreen('screen-loading');
    try {
      await loadData();
    } catch {
      document.getElementById('loading-msg').textContent = '⚠️ Failed to load. Please refresh.';
      return;
    }
  }

  state.questionIndex     = 0;
  state.answers           = [];
  state.answeredThisRound = false;
  state.sortedResults     = null;

  showScreen('screen-game');
  updateProgressTrack();
  renderQuestion();
}

function renderQuestion() {
  state.answeredThisRound = false;
  const q    = QUESTIONS.questions[state.questionIndex];
  const area = document.getElementById('question-area');

  document.getElementById('hud-q-num').textContent = state.questionIndex + 1;
  updateProgressTrack();

  const OPTIONS = [
    { value: -10, cls: 'scale-sd', emoji: '😤', label: 'Strongly\nDisagree' },
    { value:  -5, cls: 'scale-d',  emoji: '🙁', label: 'Disagree'           },
    { value:   0, cls: 'scale-n',  emoji: '🤷', label: 'Not Sure'           },
    { value:   5, cls: 'scale-a',  emoji: '🙂', label: 'Agree'              },
    { value:  10, cls: 'scale-sa', emoji: '😊', label: 'Strongly\nAgree'    },
  ];

  const planet = PLANET_IMGS[state.questionIndex % PLANET_IMGS.length];

  const wrapper = document.createElement('div');
  wrapper.className = 'q-animate-in';
  wrapper.innerHTML = `
    <div class="q-header">
      <span class="q-topic">${escHtml(q.topic)}</span>
      <span class="q-counter">Q ${state.questionIndex + 1} of ${QUESTIONS.questions.length}</span>
    </div>
    <p class="q-text">"${escHtml(q.text)}"</p>
    ${planet ? `
    <div class="q-planet-wrap">
      <img class="q-planet-img" src="images/${encodeURIComponent(planet.file)}" alt="${escHtml(planet.name)}">
      <span class="q-planet-name">${escHtml(planet.name)}</span>
    </div>` : ''}
    <div class="options-scale">
      ${OPTIONS.map(o => `
        <button class="scale-btn ${o.cls}" data-value="${o.value}">
          <span class="scale-emoji">${o.emoji}</span>
          <span class="scale-label">${o.label.replace('\n', '<br>')}</span>
        </button>
      `).join('')}
    </div>
  `;

  area.innerHTML = '';
  area.appendChild(wrapper);

  wrapper.querySelectorAll('[data-value]').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.value, 10)));
  });

  resetKeyboardFocus();
}

async function handleAnswer(value) {
  if (state.answeredThisRound) return;
  state.answeredThisRound = true;

  state.answers[state.questionIndex] = value;

  // Highlight selection, dim others
  getOptionButtons().forEach(btn => {
    const v = parseInt(btn.dataset.value, 10);
    btn.classList.toggle('selected', v === value);
    btn.classList.toggle('dimmed',   v !== value);
  });

  updateProgressTrack();

  await delay(480);

  state.questionIndex++;

  if (state.questionIndex >= QUESTIONS.questions.length) {
    await showResults();
  } else {
    renderQuestion();
  }
}

// ── Candidate detail (lazy-loaded) ───────────────────────────────────────────
const _candCache = {};

async function fetchCandidate(slug) {
  if (_candCache[slug]) return _candCache[slug];
  const res = await fetch(`candidates/${slug}.json`);
  _candCache[slug] = await res.json();
  return _candCache[slug];
}

function renderCandidateDetail(cand) {
  const TOPIC_LABELS = {
    economy: 'Economy', housing: 'Housing', healthcare: 'Healthcare',
    education: 'Education', environment: 'Environment',
    immigration: 'Immigration', publicSafety: 'Public Safety',
  };
  const knownPositions = Object.entries(cand.positions || {})
    .filter(([, v]) => v && v !== 'Not explicitly stated')
    .map(([k, v]) => `<div class="pos-row"><span class="pos-topic">${TOPIC_LABELS[k] || k}</span><span class="pos-val">${escHtml(v)}</span></div>`)
    .join('');

  let websiteUrl = cand.website ? cand.website.trim() : '';
  if (websiteUrl && !websiteUrl.startsWith('http')) websiteUrl = 'https://' + websiteUrl;

  return `
    ${cand.background ? `<p class="cand-bio">${escHtml(cand.background)}</p>` : ''}
    ${knownPositions ? `<div class="cand-positions">${knownPositions}</div>` : ''}
    ${websiteUrl ? `<a class="cand-website-link" href="${websiteUrl}" target="_blank" rel="noopener noreferrer">${escHtml(cand.website)} ↗</a>` : ''}
  `.trim();
}

function setupLearnMoreHandlers() {
  document.querySelectorAll('.learn-more-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slug = btn.dataset.slug;
      const detail = document.getElementById('cand-detail-' + slug);
      const open   = detail.style.display !== 'none';

      if (open) {
        detail.style.display = 'none';
        btn.textContent = 'Learn more ▾';
        return;
      }

      btn.textContent = '...';
      try {
        const cand = await fetchCandidate(slug);
        detail.innerHTML = renderCandidateDetail(cand);
      } catch {
        detail.innerHTML = '<p class="cand-bio" style="opacity:.5">Could not load details.</p>';
      }
      detail.style.display = 'block';
      btn.textContent = 'Less ▴';
    });
  });
}

// ── Results ───────────────────────────────────────────────────────────────────
function calcResults() {
  const numQ   = QUESTIONS.questions.length;
  const maxDiff = numQ * 20; // 10 questions × max diff per q (20) = 200

  return CANDIDATES.candidates.map(c => {
    let totalDiff = 0;
    for (let i = 0; i < numQ; i++) {
      const userVal = state.answers[i] ?? 0;
      const candVal = QUESTIONS.questions[i].scores[c.slug] ?? 0;
      totalDiff += Math.abs(userVal - candVal);
    }
    const matchPct = Math.round(((maxDiff - totalDiff) / maxDiff) * 100);
    return { ...c, totalDiff, matchPct };
  }).sort((a, b) => b.matchPct - a.matchPct);
}

async function showResults() {
  await showCelebration();

  state.sortedResults = calcResults();
  showScreen('screen-results');

  // Render top 3
  const top3 = state.sortedResults.slice(0, 3);
  document.getElementById('results-podium').innerHTML = top3.map((c, i) =>
    resultCardHTML(c, i)
  ).join('');

  // Render all candidates list
  document.getElementById('all-candidates-list').innerHTML =
    state.sortedResults.map((c, i) => candRowHTML(c, i)).join('');

  setupLearnMoreHandlers();

  // Animate bars in after a tick (so CSS transition fires)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.result-bar-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
      document.querySelectorAll('.cand-bar-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    });
  });
}

function resultCardHTML(c, i) {
  const medals = ['🥇', '🥈', '🥉'];
  return `
    <div class="result-card${i === 0 ? ' rank-1' : ''}">
      <div class="result-rank">${medals[i]}</div>
      <div class="result-info">
        <div class="result-name">${escHtml(c.name)}</div>
        <div class="result-party ${partyClass(c.party)}">${partyShort(c.party)}</div>
        <div class="result-match-row">
          <span class="result-match-pct">${c.matchPct}%</span>
          <div class="result-bar-wrap">
            <div class="result-bar-fill" data-pct="${c.matchPct}" style="width:0"></div>
          </div>
          <span class="result-match-emoji">${matchEmoji(c.matchPct)}</span>
        </div>
        <button class="learn-more-btn" data-slug="${c.slug}">Learn more ▾</button>
        <div class="cand-detail" id="cand-detail-${c.slug}" style="display:none"></div>
      </div>
    </div>`;
}

function candRowHTML(c, i) {
  return `
    <div class="cand-item">
      <div class="cand-row">
        <span class="cand-rank">${i + 1}.</span>
        <span class="cand-name">${escHtml(c.name)}</span>
        <span class="cand-party-badge ${partyClass(c.party)}">${partyInitial(c.party)}</span>
        <div class="cand-bar-wrap">
          <div class="cand-bar-fill" data-pct="${c.matchPct}" style="width:0"></div>
        </div>
        <span class="cand-pct">${c.matchPct}%</span>
        <button class="learn-more-btn learn-more-sm" data-slug="${c.slug}">▾</button>
      </div>
      <div class="cand-detail" id="cand-detail-${c.slug}" style="display:none"></div>
    </div>`;
}

// ── Celebration overlay ───────────────────────────────────────────────────────
function showCelebration() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'celebrate-overlay';
    overlay.innerHTML = `
      <div class="cel-bear">🐻</div>
      <div class="cel-sub">Calculating your match...</div>
      <div class="cel-sparks" aria-hidden="true">
        ${Array.from({ length: 12 }, (_, i) =>
          `<span class="cel-spark" style="--i:${i}"></span>`
        ).join('')}
      </div>`;
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('cel-out');
      overlay.addEventListener('animationend', () => {
        overlay.remove();
        resolve();
      }, { once: true });
    }, 1900);
  });
}

// ── Progress track ────────────────────────────────────────────────────────────
function updateProgressTrack() {
  const boxes = document.getElementById('progress-boxes');
  if (!boxes) return;
  const total = QUESTIONS ? QUESTIONS.questions.length : 16;
  const label = document.getElementById('hud-q-total');
  if (label) label.textContent = `of ${total}`;
  boxes.innerHTML = '';
  // Render reversed: bottom = Q1, top = Q10
  for (let i = total - 1; i >= 0; i--) {
    const box = document.createElement('div');
    if (i < state.questionIndex) {
      box.className = 'progress-box answered';
    } else if (i === state.questionIndex) {
      box.className = 'progress-box current';
    } else {
      box.className = 'progress-box pending';
    }
    boxes.appendChild(box);
  }
}

// ── Screen switching ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-title') {
    startTitleBears();
  } else {
    stopTitleBears();
  }
}

// ── Title screen bear bouncer ─────────────────────────────────────────────────
let bearBouncerRaf = null;

function startTitleBears() {
  const screen = document.getElementById('screen-title');
  const els    = [...screen.querySelectorAll('.title-bear')];
  const SIZE   = 52;
  const SPEED  = 1.7;

  const bears = els.map((el, i) => {
    const w  = window.innerWidth;
    const h  = window.innerHeight;
    const x  = 80 + i * (w / 4);
    const y  = 80 + i * (h / 5);
    const vx = (Math.random() < 0.5 ? 1 : -1) * (SPEED * 0.7 + Math.random() * SPEED * 0.6);
    const vy = (Math.random() < 0.5 ? 1 : -1) * (SPEED * 0.7 + Math.random() * SPEED * 0.6);
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    return { el, x, y, vx, vy };
  });

  function obstacles() {
    const sr = screen.getBoundingClientRect();
    return [...screen.querySelectorAll('.game-title,.game-subtitle,.big-btn')]
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          l: r.left  - sr.left - 4, t: r.top    - sr.top  - 4,
          r: r.right - sr.left + 4, b: r.bottom - sr.top  + 4,
        };
      });
  }

  function tick() {
    const W   = window.innerWidth;
    const H   = window.innerHeight;
    const obs = obstacles();

    for (const d of bears) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0)        { d.x = 0;       d.vx =  Math.abs(d.vx); }
      if (d.x + SIZE > W) { d.x = W - SIZE; d.vx = -Math.abs(d.vx); }
      if (d.y < 0)        { d.y = 0;        d.vy =  Math.abs(d.vy); }
      if (d.y + SIZE > H) { d.y = H - SIZE; d.vy = -Math.abs(d.vy); }

      const cx = d.x + SIZE / 2, cy = d.y + SIZE / 2;
      for (const o of obs) {
        if (cx > o.l && cx < o.r && cy > o.t && cy < o.b) {
          const dl = Math.abs(cx - o.l), dr = Math.abs(cx - o.r);
          const dt = Math.abs(cy - o.t), db = Math.abs(cy - o.b);
          const m  = Math.min(dl, dr, dt, db);
          if (m === dl || m === dr) d.vx = -d.vx; else d.vy = -d.vy;
        }
      }
      d.el.style.left = d.x + 'px';
      d.el.style.top  = d.y + 'px';
    }

    // Bear–bear bounce
    for (let i = 0; i < bears.length; i++) {
      for (let j = i + 1; j < bears.length; j++) {
        const a = bears[i], b = bears[j];
        const dx   = (b.x + SIZE / 2) - (a.x + SIZE / 2);
        const dy   = (b.y + SIZE / 2) - (a.y + SIZE / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < SIZE && dist > 0) {
          const nx  = dx / dist, ny = dy / dist;
          const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
          const dot = dvx * nx + dvy * ny;
          a.vx -= dot * nx; a.vy -= dot * ny;
          b.vx += dot * nx; b.vy += dot * ny;
          const ov = SIZE - dist;
          a.x -= nx * ov / 2; a.y -= ny * ov / 2;
          b.x += nx * ov / 2; b.y += ny * ov / 2;
        }
      }
    }

    bearBouncerRaf = requestAnimationFrame(tick);
  }

  cancelAnimationFrame(bearBouncerRaf);
  tick();
}

function stopTitleBears() {
  cancelAnimationFrame(bearBouncerRaf);
  bearBouncerRaf = null;
}

// ── Keyboard navigation ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (document.getElementById('screen-title').classList.contains('active')) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-play').click();
    }
    return;
  }

  if (!document.getElementById('screen-game').classList.contains('active')) return;
  if (state.answeredThisRound) return;

  const buttons = getOptionButtons();
  if (!buttons.length) return;

  // Left/Right OR Up/Down navigate the scale
  const fwd = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
  const bwd = (e.key === 'ArrowLeft'  || e.key === 'ArrowUp');

  if (fwd || bwd) {
    e.preventDefault();
    if (focusedOptionIndex === -1) {
      focusedOptionIndex = fwd ? 0 : buttons.length - 1;
    } else {
      const next = focusedOptionIndex + (fwd ? 1 : -1);
      if (next >= 0 && next < buttons.length) focusedOptionIndex = next;
    }
    applyKeyboardFocus(buttons);
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (focusedOptionIndex >= 0 && focusedOptionIndex < buttons.length) {
      buttons[focusedOptionIndex].click();
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function partyClass(party) {
  const p = party.toLowerCase();
  if (p.includes('democrat'))    return 'party-dem';
  if (p.includes('republican'))  return 'party-rep';
  if (p.includes('peace'))       return 'party-paf';
  if (p.includes('socialist') || p.includes('solidarity')) return 'party-soc';
  return 'party-npp';
}

function partyShort(party) {
  const p = party.toLowerCase();
  if (p.includes('democrat'))   return 'Democrat';
  if (p.includes('republican')) return 'Republican';
  if (p.includes('peace') && p.includes('freedom')) return 'Peace & Freedom';
  if (p.includes('solidarity')) return 'Amer. Solidarity';
  if (p.includes('socialist'))  return 'Socialist Workers';
  return 'Independent';
}

function partyInitial(party) {
  const p = party.toLowerCase();
  if (p.includes('democrat'))   return 'D';
  if (p.includes('republican')) return 'R';
  if (p.includes('peace'))      return 'P&F';
  return 'I';
}

function matchEmoji(pct) {
  if (pct >= 80) return '🎯';
  if (pct >= 65) return '✅';
  if (pct >= 50) return '🤝';
  if (pct >= 35) return '⚡';
  return '🌊';
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-title');

  document.getElementById('btn-play').addEventListener('click', startGame);

  document.getElementById('btn-quit-game').addEventListener('click', () => {
    if (confirm('Quit the quiz?')) showScreen('screen-title');
  });

  document.getElementById('btn-retake').addEventListener('click', startGame);

  document.getElementById('btn-toggle-all').addEventListener('click', () => {
    const panel  = document.getElementById('all-candidates-panel');
    const hidden = panel.style.display === 'none';
    panel.style.display = hidden ? 'flex' : 'none';
    if (hidden) {
      document.getElementById('btn-toggle-all').textContent = '📋 Hide Full List';
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      document.getElementById('btn-toggle-all').textContent = '📋 All 32 Candidates';
    }
  });

  document.getElementById('btn-hide-all').addEventListener('click', () => {
    document.getElementById('all-candidates-panel').style.display = 'none';
    document.getElementById('btn-toggle-all').textContent = '📋 All 32 Candidates';
  });
});
