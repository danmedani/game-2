// Shared physics constants, collision functions, and rendering utilities.
// Used by both game.js and admin.html.

const CANVAS_W = 400;
const CANVAS_H = 700;
const BALL_RADIUS = 16;
const GLOW_DURATION = 0.35;  // seconds items glow after impact
const SLOW_MO_TARGET = 0.13; // slow-mo speed factor

// ── Stars ────────────────────────────────────────────────────────────────────

function generateStars(arr, count = 90) {
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      r: Math.random() * 1.4 + 0.3,
      baseAlpha: Math.random() * 0.45 + 0.12,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function renderStars(ctx, stars) {
  const t = Date.now() / 2200;
  for (const s of stars) {
    const a = s.baseAlpha + Math.sin(t + s.phase) * 0.07;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, a)})`;
    ctx.fill();
  }
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function closestPointOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

// ── Collision resolution ─────────────────────────────────────────────────────

// ball: { x, y, vx, vy }
// Returns true if a collision was resolved.
function resolveSegmentCollision(ball, ax, ay, bx, by, bounciness) {
  const { x: cx, y: cy } = closestPointOnSeg(ball.x, ball.y, ax, ay, bx, by);
  const nx = ball.x - cx, ny = ball.y - cy;
  const dist = Math.sqrt(nx * nx + ny * ny);
  if (dist < BALL_RADIUS && dist > 0.01) {
    const inv = 1 / dist;
    const nnx = nx * inv, nny = ny * inv;
    // Push ball out of surface
    ball.x = cx + nnx * (BALL_RADIUS + 0.5);
    ball.y = cy + nny * (BALL_RADIUS + 0.5);
    // Reflect velocity (only if approaching)
    const dot = ball.vx * nnx + ball.vy * nny;
    if (dot < 0) {
      ball.vx -= (1 + bounciness) * dot * nnx;
      ball.vy -= (1 + bounciness) * dot * nny;
      return true;
    }
  }
  return false;
}

function resolveCircleCollision(ball, cx, cy, cr, bounciness) {
  const dx = ball.x - cx, dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minD = BALL_RADIUS + cr;
  if (dist < minD && dist > 0.01) {
    const inv = 1 / dist;
    const nx = dx * inv, ny = dy * inv;
    ball.x = cx + nx * (minD + 0.5);
    ball.y = cy + ny * (minD + 0.5);
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
      ball.vx -= (1 + bounciness) * dot * nx;
      ball.vy -= (1 + bounciness) * dot * ny;
      return true;
    }
  }
  return false;
}

// ── Item geometry ─────────────────────────────────────────────────────────────

// Returns pixel center for a level item (which stores fractional x/y)
function itemPx(item) {
  return { px: item.x * CANVAS_W, py: item.y * CANVAS_H };
}

function getBarEndpoints(item) {
  const angle = item.rotation * Math.PI / 180;
  const hLen = item.length / 2;
  const cx = 'px' in item ? item.px : item.x * CANVAS_W;
  const cy = 'py' in item ? item.py : item.y * CANVAS_H;
  return {
    ax: cx - Math.cos(angle) * hLen,
    ay: cy - Math.sin(angle) * hLen,
    bx: cx + Math.cos(angle) * hLen,
    by: cy + Math.sin(angle) * hLen,
  };
}

function getTriangleVertices(item) {
  const R = item.size || 30;
  const rot = (item.rotation || 0) * Math.PI / 180;
  const cx = 'px' in item ? item.px : item.x * CANVAS_W;
  const cy = 'py' in item ? item.py : item.y * CANVAS_H;
  return [0, 1, 2].map(i => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI / 3) + rot;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
}

// ── Unified item collision ───────────────────────────────────────────────────

function collideItemWithBall(ball, item, bounciness) {
  if (item.type === 'bar') {
    const { ax, ay, bx, by } = getBarEndpoints(item);
    return resolveSegmentCollision(ball, ax, ay, bx, by, bounciness);
  }
  if (item.type === 'circle') {
    const cx = 'px' in item ? item.px : item.x * CANVAS_W;
    const cy = 'py' in item ? item.py : item.y * CANVAS_H;
    return resolveCircleCollision(ball, cx, cy, item.radius, bounciness);
  }
  if (item.type === 'triangle') {
    const verts = getTriangleVertices(item);
    let hit = false;
    for (let i = 0; i < 3; i++) {
      const a = verts[i], b = verts[(i + 1) % 3];
      if (resolveSegmentCollision(ball, a.x, a.y, b.x, b.y, bounciness)) hit = true;
    }
    return hit;
  }
  return false;
}

// ── Item colors ──────────────────────────────────────────────────────────────

function itemColor(type) {
  switch (type) {
    case 'bar':      return '#7799cc';
    case 'circle':   return '#22ddaa';
    case 'triangle': return '#cc55ff';
    default:         return '#aaaaaa';
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────

function drawItem(ctx, item, overrideGlowT) {
  const glowT = overrideGlowT !== undefined ? overrideGlowT : (item.glowT || 0);
  const glowing = glowT > 0;
  const gl = Math.min(glowT / GLOW_DURATION, 1);
  const color = itemColor(item.type);

  ctx.save();
  if (glowing) {
    ctx.shadowBlur = 22 * gl;
    ctx.shadowColor = color;
  }

  switch (item.type) {
    case 'bar': {
      const { ax, ay, bx, by } = getBarEndpoints(item);
      ctx.lineCap = 'round';
      ctx.lineWidth = 11;
      ctx.strokeStyle = glowing ? lighten(color, gl * 0.6) : color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      break;
    }
    case 'circle': {
      const cx = 'px' in item ? item.px : item.x * CANVAS_W;
      const cy = 'py' in item ? item.py : item.y * CANVAS_H;
      ctx.beginPath();
      ctx.arc(cx, cy, item.radius, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = glowing ? lighten(color, gl * 0.6) : color;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = color + '88';
      ctx.fill();
      break;
    }
    case 'triangle': {
      const verts = getTriangleVertices(item);
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      ctx.lineTo(verts[1].x, verts[1].y);
      ctx.lineTo(verts[2].x, verts[2].y);
      ctx.closePath();
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = glowing ? lighten(color, gl * 0.6) : color;
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// Lighten a hex color toward white by factor 0-1
function lighten(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `rgb(${lr},${lg},${lb})`;
}

function drawPlayerBar(ctx, bar, showHandles) {
  // bar.x and bar.y are always pixel coordinates (callers convert from fractions)
  const angle = bar.rotation * Math.PI / 180;
  const hLen = bar.length / 2;
  const cx = bar.x;
  const cy = bar.y;
  const ax = cx - Math.cos(angle) * hLen;
  const ay = cy - Math.sin(angle) * hLen;
  const bx = cx + Math.cos(angle) * hLen;
  const by = cy + Math.sin(angle) * hLen;

  const px = cx;
  const py = cy;

  const glowing = (bar.glowT || 0) > 0;

  ctx.save();
  if (glowing) {
    ctx.shadowBlur = 28;
    ctx.shadowColor = '#ffffff';
  }

  // Outer glow ring (always visible for player bar)
  ctx.lineCap = 'round';
  ctx.lineWidth = 17;
  ctx.strokeStyle = 'rgba(180,190,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  // Main bar
  ctx.lineWidth = 12;
  ctx.strokeStyle = glowing ? '#ffffff' : '#ccd0ff';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  // Gold center stripe
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.restore();

  if (showHandles) {
    // End handles (rotate)
    [[bx, by], [ax, ay]].forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,215,0,0.22)';
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↻', hx, hy);
    });

    // Center handle (move)
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✥', px, py);
  }
}

function drawBucket(ctx, bucket, sealed) {
  const bx = 'px' in bucket ? bucket.px : bucket.x * CANVAS_W;
  const by = 'py' in bucket ? bucket.py : bucket.y * CANVAS_H;
  const { width, height, wallThickness: wt, glowT } = bucket;
  const hw = width / 2;
  const glowing = (glowT || 0) > 0;

  ctx.save();
  ctx.shadowBlur = glowing ? 35 : 10;
  ctx.shadowColor = '#ffd700';

  const goldGrad = ctx.createLinearGradient(bx - hw - wt, by, bx + hw + wt, by + height);
  goldGrad.addColorStop(0, '#ffe566');
  goldGrad.addColorStop(0.5, '#ffa800');
  goldGrad.addColorStop(1, '#cc7700');
  ctx.fillStyle = goldGrad;

  // Left wall
  ctx.fillRect(bx - hw - wt, by, wt, height + wt);
  // Right wall
  ctx.fillRect(bx + hw, by, wt, height + wt);
  // Bottom
  ctx.fillRect(bx - hw - wt, by + height, width + wt * 2, wt);

  // Sealed cap
  if (sealed) {
    ctx.fillRect(bx - hw, by - 1, width, wt * 0.8);
  }

  // Inner faint gold
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,200,0,0.08)';
  ctx.fillRect(bx - hw, by, width, height);

  ctx.restore();

  // "GOAL" label
  if (!sealed) {
    ctx.save();
    ctx.font = 'bold 10px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('GOAL', bx, by - 7);
    ctx.restore();
  }
}

function drawBallAt(ctx, x, y, squash) {
  const sq = squash !== undefined ? squash : 1.0;
  const scaleX = 1 + (1 - sq) * 0.45;
  const scaleY = sq;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);

  // Outer glow
  ctx.shadowBlur = 12;
  ctx.shadowColor = 'rgba(200,210,255,0.6)';

  // Ball body gradient (moon-like)
  const grad = ctx.createRadialGradient(
    -BALL_RADIUS * 0.35, -BALL_RADIUS * 0.35, 1,
    0, 0, BALL_RADIUS
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.38, '#d0d0e0');
  grad.addColorStop(0.75, '#9090a8');
  grad.addColorStop(1, '#404058');

  ctx.beginPath();
  ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Specular highlight
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(-BALL_RADIUS * 0.34, -BALL_RADIUS * 0.34, BALL_RADIUS * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();

  // Moon craters
  ctx.strokeStyle = 'rgba(40,40,70,0.32)';
  ctx.lineWidth = 1;

  ctx.beginPath(); ctx.arc(4, 3, 3.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-5, -2, 2.2, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(1.5, -6, 1.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-3, 5, 1.2, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}
