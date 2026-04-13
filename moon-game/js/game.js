'use strict';
// ================================================================
// Moon Game — main game logic
// Requires: config.js, scores.js, levels.js, physics.js
// ================================================================

// ── Game State ──────────────────────────────────────────────────
const G = {
  screen: 'title',
  level: 1,
  levelsCompleted: 0,
  attempts: 0,

  // Physics objects (populated by loadLevel / resetAttempt)
  ball: null,
  playerBar: null,  // { x, y, rotation, length, glowT }  — x/y are pixel coords
  levelItems: [],   // items enriched with { px, py, glowT }
  bucket: null,     // enriched with { px, py, glowT }
  bucketSealed: false,
  slowMo: false,
  slowMoFactor: 1.0,
  levelDone: false,
  nextBtnShownAt: 0,

  levelData: null,
  globals: null,
  stars: [],
  ballTrail: [],

  drag: { active: false, type: null, ox: 0, oy: 0, bx: 0, by: 0 },

  rafId: null,
  lastTs: 0,
  canvas: null,
  ctx: null,
};

// ── Init ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  G.canvas = document.getElementById('game-canvas');
  G.ctx = G.canvas.getContext('2d');
  G.canvas.width = CANVAS_W;
  G.canvas.height = CANVAS_H;

  generateStars(G.stars);
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);

  bindButtons();
  bindPointerEvents();
  bindKeyboard();

  const p = new URLSearchParams(location.search);
  if (p.get('test') === '1') {
    const lvl = parseInt(p.get('level') || '1');
    loadLevel(lvl);
    showScreen('game');
    return;
  }

  const saved = getSavedSession();
  if (saved && saved.level > 1) {
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.style.display = '';
      continueBtn.textContent = `Continue (Level ${saved.level})`;
    }
  }
  showScreen('title');
});

function scaleCanvas() {
  const c = G.canvas;
  const container = c.parentElement;
  const avW = container.clientWidth || window.innerWidth;
  const avH = window.innerHeight - 160;
  const scale = Math.min(avW / CANVAS_W, avH / CANVAS_H);
  c.style.width  = Math.round(CANVAS_W * scale) + 'px';
  c.style.height = Math.round(CANVAS_H * scale) + 'px';
}

// ── Screens ──────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(name + '-screen');
  if (el) el.classList.add('active');
  G.screen = name;

  if (name === 'game') {
    scaleCanvas();
    startLoop();
  } else {
    stopLoop();
  }
}

// ── Level Management ─────────────────────────────────────────────
function loadLevel(num) {
  const data = getLevel(num);
  G.levelData = data;
  G.globals = getGlobals();
  G.level = data.id;
  G.attempts = 0;

  // Enrich items with pixel positions + glow state
  G.levelItems = data.items.map(item => ({
    ...item,
    px: item.x * CANVAS_W,
    py: item.y * CANVAS_H,
    glowT: 0,
  }));

  // Enrich bucket
  const b = data.bucket;
  G.bucket = { ...b, px: b.x * CANVAS_W, py: b.y * CANVAS_H, glowT: 0 };

  // Player bar in pixel coords
  G.playerBar = {
    x: data.playerBar.x * CANVAS_W,
    y: data.playerBar.y * CANVAS_H,
    rotation: data.playerBar.rotation,
    length: data.playerBar.length,
    glowT: 0,
  };

  resetAttempt(true);
  updateHUD();
}

function resetAttempt(keepBar) {
  const data = G.levelData;
  G.ball = {
    x: data.ballX * CANVAS_W,
    y: BALL_RADIUS + 8,
    vx: 0,
    vy: 0,
    dropped: false,
    inBucket: false,
    squash: 1.0,
  };
  G.bucketSealed = false;
  G.slowMo = false;
  G.slowMoFactor = 1.0;
  G.levelDone = false;
  G.nextBtnShownAt = 0;
  G.ballTrail = [];

  G.levelItems.forEach(item => { item.glowT = 0; });
  if (G.bucket) G.bucket.glowT = 0;
  if (G.playerBar) G.playerBar.glowT = 0;

  setDropBtn('drop');
  showNextBtn(false);
  delete document.getElementById('next-level-btn').dataset.shown;
}

// ── Game Loop ────────────────────────────────────────────────────
function startLoop() {
  if (G.rafId) cancelAnimationFrame(G.rafId);
  G.lastTs = performance.now();
  function loop(ts) {
    const dt = Math.min((ts - G.lastTs) / 1000, 0.05);
    G.lastTs = ts;
    if (G.screen === 'game') update(dt);
    renderFrame();
    G.rafId = requestAnimationFrame(loop);
  }
  G.rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (G.rafId) { cancelAnimationFrame(G.rafId); G.rafId = null; }
}

// ── Physics Update ───────────────────────────────────────────────
function update(dt) {
  const ball = G.ball;
  if (!ball || !ball.dropped) return;

  const { gravity, bounciness } = G.globals;

  const SUB = 4;
  const subDt = dt / SUB;

  const bwalls = G.bucket ? getBucketWalls(G.bucket) : null;
  let bucketBottomHit = false;
  let bucketWallHit = false;

  for (let s = 0; s < SUB; s++) {
    // Apply gravity (normalised to 60fps)
    ball.vy += gravity * subDt * 60;
    ball.x  += ball.vx * subDt * 60;
    ball.y  += ball.vy * subDt * 60;

    // Level items
    for (const item of G.levelItems) {
      if (collideItemWithBall(ball, item, bounciness)) {
        item.glowT = GLOW_DURATION;
        playHit(item.type);
        triggerSquash(ball);
      }
    }

    // Player bar
    {
      const bar = G.playerBar;
      const angle = bar.rotation * Math.PI / 180;
      const hLen = bar.length / 2;
      const ax = bar.x - Math.cos(angle) * hLen;
      const ay = bar.y - Math.sin(angle) * hLen;
      const bx = bar.x + Math.cos(angle) * hLen;
      const by = bar.y + Math.sin(angle) * hLen;
      if (resolveSegmentCollision(ball, ax, ay, bx, by, bounciness)) {
        bar.glowT = GLOW_DURATION;
        playHit('player');
        triggerSquash(ball);
      }
    }

    // Bucket walls
    if (bwalls) {
      const { tl, tr, bl, br, inX, inY, openMidX, openMidY } = bwalls;
      if (resolveSegmentCollision(ball, tl.x, tl.y, bl.x, bl.y, bounciness)) bucketWallHit = true; // left
      if (resolveSegmentCollision(ball, tr.x, tr.y, br.x, br.y, bounciness)) bucketWallHit = true; // right
      if (G.bucketSealed) {
        // Fully sealed — all 4 walls keep the ball contained
        const hitB = resolveSegmentCollision(ball, bl.x, bl.y, br.x, br.y, bounciness); // bottom
        const hitT = resolveSegmentCollision(ball, tl.x, tl.y, tr.x, tr.y, bounciness); // top cap
        if (hitB || hitT) bucketWallHit = true;
      } else {
        // Win triggers when ball hits the bottom wall
        if (resolveSegmentCollision(ball, bl.x, bl.y, br.x, br.y, bounciness)) {
          bucketBottomHit = true;
        }
        // One-way lid: only blocks when ball is on the interior side of the opening
        const dx = ball.x - openMidX, dy = ball.y - openMidY;
        if (dx * inX + dy * inY > 0) {
          resolveSegmentCollision(ball, tl.x, tl.y, tr.x, tr.y, bounciness);
        }
      }
    }
  }

  if (bucketBottomHit && !G.bucketSealed) {
    onBucketEntry();
  }
  if (bucketWallHit) {
    playBucketWallHit();
  }

  // Out-of-bounds check (no side/bottom walls — ball just vanishes)
  if (!ball.inBucket &&
      (ball.x < -BALL_RADIUS - 10 || ball.x > CANVAS_W + BALL_RADIUS + 10 ||
       ball.y > CANVAS_H + BALL_RADIUS + 10)) {
    onBallLost();
    return;
  }

  // Squash spring-back
  if (ball.squash < 1.0) {
    ball.squash += (1.0 - ball.squash) * Math.min(dt * 14, 1);
  }

  // Glow timers
  G.levelItems.forEach(item => { if (item.glowT > 0) item.glowT -= dt; });
  if (G.playerBar.glowT > 0) G.playerBar.glowT -= dt;
  if (G.bucket && G.bucket.glowT > 0 && G.bucket.glowT < 999) G.bucket.glowT -= dt;

  // Ball trail
  G.ballTrail.push({ x: ball.x, y: ball.y, a: 1.0 });
  while (G.ballTrail.length > 28) G.ballTrail.shift();
  const trailDecay = 5;
  G.ballTrail.forEach(p => { p.a -= dt * trailDecay; });
  G.ballTrail = G.ballTrail.filter(p => p.a > 0);

  // Auto-show Next Level button once ball settles
  if (G.levelDone && !document.getElementById('next-level-btn').dataset.shown) {
    if (!G.nextBtnShownAt) G.nextBtnShownAt = Date.now();
    const elapsed = (Date.now() - G.nextBtnShownAt) / 1000;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (elapsed > 1.8 || speed < 0.6) {
      document.getElementById('next-level-btn').dataset.shown = '1';
      showNextBtn(true);
    }
  }
}

function onBucketEntry() {
  G.ball.inBucket = true;
  G.bucketSealed = true;
  G.slowMo = true;
  G.levelDone = true;
  G.bucket.glowT = 999;
  playBucketEntry();
  setDropBtn('hide');
}

function onBallLost() {
  G.attempts++;
  updateHUD();
  resetAttempt(false);
}

function triggerSquash(ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 1.5) ball.squash = Math.max(0.68, 1.0 - speed * 0.035);
}

// ── Rendering ────────────────────────────────────────────────────
function renderFrame() {
  const ctx = G.ctx;
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  renderStars(ctx, G.stars);

  // Level items
  G.levelItems.forEach(item => drawItem(ctx, item));

  // Bucket
  if (G.bucket) drawBucket(ctx, G.bucket, G.bucketSealed);

  // Player bar (with handles when ball not yet dropped)
  if (G.playerBar) drawPlayerBar(ctx, G.playerBar, !G.ball?.dropped);

  // Ghost ball at start position (before drop)
  if (G.ball && !G.ball.dropped && G.levelData) {
    const gx = G.levelData.ballX * CANVAS_W;
    const gy = BALL_RADIUS + 8;
    ctx.save();
    ctx.globalAlpha = 0.38;
    drawBallAt(ctx, gx, gy, 1.0);
    ctx.globalAlpha = 1;
    // Dashed drop-line hint
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy + BALL_RADIUS + 4);
    ctx.lineTo(gx, gy + BALL_RADIUS + 36);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Active ball + trail
  if (G.ball?.dropped) {
    // Trail
    G.ballTrail.forEach(p => {
      const r = Math.max(1, BALL_RADIUS * 0.3 * p.a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190,205,255,${p.a * 0.18})`;
      ctx.fill();
    });

    drawBallAt(ctx, G.ball.x, G.ball.y, G.ball.squash);
  }

  // Slow-mo blue vignette
  if (G.slowMo && G.slowMoFactor < 0.85) {
    const a = (1 - G.slowMoFactor / 0.85) * 0.2;
    ctx.fillStyle = `rgba(70,130,255,${Math.min(a, 0.2)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Level done golden pulse
  if (G.levelDone) {
    const pulse = Math.sin(Date.now() / 250) * 0.04 + 0.04;
    ctx.fillStyle = `rgba(255,210,0,${pulse})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

// ── Input ─────────────────────────────────────────────────────────
function bindPointerEvents() {
  const c = G.canvas;
  c.addEventListener('mousedown',  e => { onDown(canvasPos(e)); });
  c.addEventListener('mousemove',  e => { onMove(canvasPos(e)); });
  c.addEventListener('mouseup',    () => onUp());
  c.addEventListener('mouseleave', () => onUp());

  c.addEventListener('touchstart', e => { e.preventDefault(); onDown(canvasPos(e.touches[0])); }, { passive: false });
  c.addEventListener('touchmove',  e => { e.preventDefault(); onMove(canvasPos(e.touches[0])); }, { passive: false });
  c.addEventListener('touchend',   e => { e.preventDefault(); onUp(); }, { passive: false });
}

function canvasPos(e) {
  const r = G.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (CANVAS_W / r.width),
    y: (e.clientY - r.top)  * (CANVAS_H / r.height),
  };
}

function onDown(pos) {
  if (G.ball?.dropped) return;
  const bar = G.playerBar;
  if (!bar) return;

  const angle = bar.rotation * Math.PI / 180;
  const hLen  = bar.length / 2;
  const ax = bar.x - Math.cos(angle) * hLen;
  const ay = bar.y - Math.sin(angle) * hLen;
  const bx = bar.x + Math.cos(angle) * hLen;
  const by = bar.y + Math.sin(angle) * hLen;

  const HIT = 22; // px hit radius

  // End handles → rotate
  if (Math.hypot(pos.x - bx, pos.y - by) < HIT ||
      Math.hypot(pos.x - ax, pos.y - ay) < HIT) {
    G.drag = { active: true, type: 'rotate', ox: 0, oy: 0, bx: bar.x, by: bar.y };
    return;
  }

  // Body of bar → move
  const { x: cp, y: cq } = closestPointOnSeg(pos.x, pos.y, ax, ay, bx, by);
  if (Math.hypot(pos.x - cp, pos.y - cq) < 18) {
    G.drag = { active: true, type: 'move', ox: pos.x - bar.x, oy: pos.y - bar.y, bx: 0, by: 0 };
  }
}

function onMove(pos) {
  if (!G.drag.active) return;
  const bar = G.playerBar;
  if (!bar) return;

  if (G.drag.type === 'move') {
    bar.x = Math.max(10, Math.min(CANVAS_W - 10, pos.x - G.drag.ox));
    bar.y = Math.max(10, Math.min(CANVAS_H - 10, pos.y - G.drag.oy));
  } else if (G.drag.type === 'rotate') {
    const angle = Math.atan2(pos.y - G.drag.by, pos.x - G.drag.bx);
    bar.rotation = angle * 180 / Math.PI;
  }
}

function onUp() {
  G.drag.active = false;
}

function bindKeyboard() {
  window.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (G.screen !== 'game') return;
    const nextBtn = document.getElementById('next-level-btn');
    if (nextBtn && nextBtn.style.display !== 'none') {
      nextBtn.click();
    } else if (G.ball && G.ball.dropped && !G.ball.inBucket) {
      onBallLost();
    } else if (G.ball && !G.ball.dropped) {
      G.ball.dropped = true;
      setDropBtn('stop');
    }
  });
}

// ── Buttons ───────────────────────────────────────────────────────
function bindButtons() {
  const $ = id => document.getElementById(id);

  $('play-btn').addEventListener('click', () => {
    G.levelsCompleted = 0;
    saveSession(1, 0);
    loadLevel(1);
    showScreen('game');
  });

  $('continue-btn').addEventListener('click', () => {
    const saved = getSavedSession();
    if (saved) {
      G.levelsCompleted = saved.levelsCompleted || 0;
      loadLevel(saved.level);
      showScreen('game');
    }
  });

  $('high-scores-btn').addEventListener('click', async () => {
    showScreen('highscores');
    const scores = await getTopScores(10);
    renderHighScores(scores);
  });

  $('back-to-title-btn').addEventListener('click', () => showScreen('title'));
  $('gameover-home-btn').addEventListener('click', () => showScreen('title'));

  $('drop-btn').addEventListener('click', () => {
    if (G.ball && G.ball.dropped && !G.ball.inBucket) {
      onBallLost();
    } else if (G.ball && !G.ball.dropped) {
      G.ball.dropped = true;
      setDropBtn('stop');
    }
  });

  $('next-level-btn').addEventListener('click', () => {
    G.levelsCompleted++;
    const nextNum = G.level + 1;
    const levels = getLevels();
    const nextData = levels.find(l => l.id === nextNum);
    if (nextData) {
      saveSession(nextNum, G.levelsCompleted);
      loadLevel(nextNum);
    } else {
      endGame();
    }
  });

  $('gameover-submit-btn').addEventListener('click', async () => {
    const raw = $('initials-input').value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (!isValidInitials(raw)) {
      $('initials-error').textContent = 'Please enter exactly 3 letters';
      return;
    }
    $('gameover-submit-btn').disabled = true;
    await saveScore({ initials: raw, score: G.levelsCompleted, game: CONFIG.game });
    $('gameover-submit-section').style.display = 'none';
    $('gameover-submitted').style.display = '';
  });

  // Type filter for initials input
  $('initials-input').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    $('initials-error').textContent = '';
  });
}

// ── HUD helpers ───────────────────────────────────────────────────
function updateHUD() {
  const lvlEl = document.getElementById('level-display');
  if (lvlEl) lvlEl.textContent = `Level ${G.level}`;
  const attEl = document.getElementById('attempts-display');
  if (attEl) attEl.textContent = G.attempts > 0 ? `${G.attempts} attempt${G.attempts !== 1 ? 's' : ''}` : '';
}

function setDropBtn(mode) {
  const btn = document.getElementById('drop-btn');
  if (!btn) return;
  if (mode === 'drop') {
    btn.textContent = 'Drop';
    btn.className = 'btn btn-drop';
    btn.disabled = false;
    btn.style.opacity = '1';
  } else if (mode === 'stop') {
    btn.textContent = 'Stop';
    btn.className = 'btn btn-stop';
    btn.disabled = false;
    btn.style.opacity = '1';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0';
  }
}

function showNextBtn(show) {
  const btn = document.getElementById('next-level-btn');
  if (btn) {
    btn.style.display = show ? '' : 'none';
    if (show) btn.classList.add('pop-in');
  }
}

// ── Game Over ─────────────────────────────────────────────────────
function endGame() {
  showScreen('gameover');
  document.getElementById('gameover-score').textContent =
    `${G.levelsCompleted} level${G.levelsCompleted !== 1 ? 's' : ''} complete!`;
  const best = getLocalBest();
  const isHigh = G.levelsCompleted > 0 && G.levelsCompleted >= best;
  document.getElementById('gameover-best').textContent =
    isHigh ? '★ New high score!' : `Best: ${best} level${best !== 1 ? 's' : ''}`;
  document.getElementById('gameover-submit-section').style.display = G.levelsCompleted > 0 ? '' : 'none';
  document.getElementById('gameover-submitted').style.display = 'none';
  document.getElementById('gameover-submit-btn').disabled = false;
  document.getElementById('initials-input').value = '';
  document.getElementById('initials-error').textContent = '';
}

// ── High Scores ───────────────────────────────────────────────────
function renderHighScores(scores) {
  const el = document.getElementById('highscores-list');
  if (!el) return;
  if (!scores.length) {
    el.innerHTML = '<p class="no-scores">No scores yet — be the first!</p>';
    return;
  }
  el.innerHTML = scores.map((s, i) => `
    <div class="score-entry rank-${i + 1}">
      <span class="rank">${i + 1}</span>
      <span class="initials">${s.initials}</span>
      <span class="score">${s.score} lvl${s.score !== 1 ? 's' : ''}</span>
    </div>`).join('');
}

// ── Session ───────────────────────────────────────────────────────
function saveSession(level, levelsCompleted) {
  localStorage.setItem('moon_session', JSON.stringify({ level, levelsCompleted }));
}

function getSavedSession() {
  try { return JSON.parse(localStorage.getItem('moon_session')); }
  catch { return null; }
}

// ── Audio ─────────────────────────────────────────────────────────
let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}

function playHit(type) {
  try {
    const ac = getAC();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    const freqMap = { bar: 300, circle: 500, triangle: 380, player: 250 };
    osc.frequency.value = freqMap[type] || 300;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.1);
  } catch (e) {}
}

function playBucketWallHit() {
  try {
    const ac = getAC();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.frequency.value = 180;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
  } catch (e) {}
}

function playBucketEntry() {
  try {
    const ac = getAC();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ac.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch (e) {}
}
