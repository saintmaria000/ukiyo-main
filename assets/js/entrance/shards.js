// assets/js/entrance/shards.js

import { CONFIG } from "./config.js";
import { clamp, lerp, rand, choose, easeOutCubic } from "./utils.js";
import { getPhase } from "./timeline.js";
import { getAnyLogoTarget, assignShardTargets } from "./logo.js";

export function createShardField(runtime) {
  const { state } = runtime;

  state.shards.length = 0;
  state.inflow.length = 0;

  const total = CONFIG.shardCount;
  const nearN = Math.round(total * CONFIG.shardNearRatio);
  const midN = Math.round(total * CONFIG.shardMidRatio);
  const farN = total - nearN - midN;

  for (let i = 0; i < nearN; i++) state.shards.push(createShard(runtime, "near"));
  for (let i = 0; i < midN; i++) state.shards.push(createShard(runtime, "mid"));
  for (let i = 0; i < farN; i++) state.shards.push(createShard(runtime, "far"));

  for (let i = 0; i < CONFIG.gravityInflowCount; i++) {
    state.inflow.push(createInflowShard(runtime));
  }

  assignShardTargets(runtime);
}

export function createShard(runtime, depthBand) {
  const { viewport } = runtime;

  const depth =
    depthBand === "near" ? rand(0.65, 1.0) :
    depthBand === "mid" ? rand(0.28, 0.64) :
    rand(0.08, 0.27);

  const isFlat = Math.random() < rand(0.22, 0.3);
  const scale = lerp(0.45, 1.85, depth);

  let len, wid;
  if (isFlat) {
    len = rand(18, 48) * scale;
    wid = rand(7, 18) * scale;
  } else {
    len = rand(12, 36) * scale;
    wid = rand(2.2, 7.2) * scale;
  }

  const angle = rand(-Math.PI, Math.PI);

  const spreadClass = Math.random();
  let spreadMul;
  if (spreadClass < CONFIG.centerRetention) {
    spreadMul = rand(0.26, 0.62);
  } else if (spreadClass < CONFIG.centerRetention + CONFIG.midRetention) {
    spreadMul = rand(0.62, 0.95);
  } else {
    spreadMul = rand(0.95, 1.45);
  }

  const baseSpeed = lerp(180, 1280, depth) * CONFIG.spreadBoost;
  const speed = baseSpeed * spreadMul;
  const vz = rand(-1.15, 1.45) * (depth > 0.6 ? 1.35 : 1.0);

  const t = getAnyLogoTarget(runtime);

  return {
    type: isFlat ? "flat" : "needle",
    depthBand,
    depth,
    x: viewport.cx,
    y: viewport.cy,
    z: depth * 320,
    dx: Math.cos(angle) * speed * rand(0.78, 1.28),
    dy: Math.sin(angle) * speed * rand(0.74, 1.26),
    dz: vz * 200,
    len,
    wid,
    rot: rand(-Math.PI, Math.PI),
    spin: rand(-3.2, 3.2),
    driftNoise: rand(0.25, 1.0),
    edgeSeed: rand(0, 1000),
    alpha: lerp(0.28, 0.92, depth),
    fillAlpha: rand(0.02, 0.08),
    dead: false,
    targetX: t.x,
    targetY: t.y
  };
}

export function createInflowShard(runtime) {
  const { viewport } = runtime;

  const side = choose(["top", "bottom", "left", "right"]);
  let x, y;

  if (side === "top") {
    x = rand(-0.35 * viewport.w, 1.35 * viewport.w);
    y = -rand(60, 320);
  } else if (side === "bottom") {
    x = rand(-0.35 * viewport.w, 1.35 * viewport.w);
    y = viewport.h + rand(60, 320);
  } else if (side === "left") {
    x = -rand(60, 340);
    y = rand(-0.2 * viewport.h, 1.2 * viewport.h);
  } else {
    x = viewport.w + rand(60, 340);
    y = rand(-0.2 * viewport.h, 1.2 * viewport.h);
  }

  const depth = rand(0.18, 0.82);
  const isFlat = Math.random() < 0.28;
  const scale = lerp(0.42, 1.55, depth);
  const t = getAnyLogoTarget(runtime);

  return {
    type: isFlat ? "flat" : "needle",
    depthBand: depth > 0.62 ? "near" : depth > 0.28 ? "mid" : "far",
    depth,
    x,
    y,
    z: depth * 220,
    dx: 0,
    dy: 0,
    dz: 0,
    len: (isFlat ? rand(16, 38) : rand(11, 26)) * scale,
    wid: (isFlat ? rand(6, 16) : rand(2.2, 6.4)) * scale,
    rot: rand(-Math.PI, Math.PI),
    spin: rand(-3, 3),
    edgeSeed: rand(0, 1000),
    alpha: lerp(0.18, 0.78, depth),
    fillAlpha: rand(0.015, 0.06),
    dead: false,
    targetX: t.x,
    targetY: t.y
  };
}

export function updateSingleShard(runtime, s, dt, t, isInflow = false) {
  const { viewport, phaseTimes } = runtime;
  const phase = getPhase(phaseTimes, t);

  if (phase === "burst" || phase === "drift") {
    s.x += s.dx * dt;
    s.y += s.dy * dt;
    s.z += s.dz * dt;
    s.rot += s.spin * dt;

    if (!isInflow) {
      const outMarginX = viewport.w * CONFIG.offscreenBoost;
      const outMarginY = viewport.h * CONFIG.offscreenBoost;
      if (
        s.x < -outMarginX || s.x > viewport.w + outMarginX ||
        s.y < -outMarginY || s.y > viewport.h + outMarginY
      ) {
        s.dead = true;
      }
    }
    return;
  }

  if (phase === "gather" || phase === "flash" || phase === "logo" || phase === "done") {
    const pullBase = isInflow ? CONFIG.gatherInflowPull : CONFIG.gatherMaxPull;
    const toX = s.targetX - s.x;
    const toY = s.targetY - s.y;
    const d = Math.hypot(toX, toY) || 1;

    const nearBoost = s.depthBand === "near" ? 1.08 : 1;
    const pull = Math.min(pullBase, (pullBase / Math.max(d * 0.36, 1))) * nearBoost;

    s.dx += (toX / d) * pull * dt;
    s.dy += (toY / d) * pull * dt;

    s.dx *= 0.94;
    s.dy *= 0.94;
    s.dz += ((0 - s.z) * CONFIG.gatherZSteer) * dt;

    s.x += s.dx * dt;
    s.y += s.dy * dt;
    s.z += s.dz * dt;
    s.rot += s.spin * dt * 0.8;

    const snapR = s.depthBand === "near" ? CONFIG.gatherSnapRadiusNear : CONFIG.gatherSnapRadius;
    const vanishR = s.depthBand === "near" ? CONFIG.vanishRadiusNear : CONFIG.vanishRadius;
    const vanishZ = isInflow ? CONFIG.vanishZInflow : CONFIG.vanishZ;

    if (d < snapR) {
      s.x = lerp(s.x, s.targetX, 0.22);
      s.y = lerp(s.y, s.targetY, 0.22);
    }

    if (d < vanishR && Math.abs(s.z) < vanishZ) {
      s.dead = true;
    }
  }
}

export function updateShards(runtime, dt, t) {
  const { state } = runtime;

  for (const s of state.shards) {
    if (!s.dead) updateSingleShard(runtime, s, dt, t, false);
  }

  for (const s of state.inflow) {
    if (!s.dead) updateSingleShard(runtime, s, dt, t, true);
  }
}

export function projectScale(z) {
  return clamp(1 + z / 420, 0.35, 2.6);
}

export function buildShardShape(s) {
  const len = s.len * projectScale(s.z);
  const wid = s.wid * projectScale(s.z);

  if (s.type === "flat") {
    return [
      { x: -len * 0.56, y: -wid * 0.42 },
      { x: len * 0.34, y: -wid * 0.56 },
      { x: len * 0.60, y: 0 },
      { x: len * 0.18, y: wid * 0.54 },
      { x: -len * 0.48, y: wid * 0.28 }
    ];
  }

  return [
    { x: -len * 0.58, y: -wid * 0.22 },
    { x: len * 0.66, y: 0 },
    { x: -len * 0.52, y: wid * 0.22 }
  ];
}

export function drawSingleShard(dom, s, fadeMul = 1) {
  const { ctx } = dom;
  const alpha = s.alpha * fadeMul;
  if (alpha <= 0.001) return;

  const shape = buildShardShape(s);

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);

  ctx.beginPath();
  ctx.moveTo(shape[0].x, shape[0].y);
  for (let i = 1; i < shape.length; i++) ctx.lineTo(shape[i].x, shape[i].y);
  ctx.closePath();

  ctx.fillStyle = `rgba(255,255,255,${s.fillAlpha * fadeMul})`;
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 0.85 + s.depth * 0.7;
  ctx.stroke();

  if (Math.random() > 0.42) {
    ctx.beginPath();
    if (s.type === "flat") {
      ctx.moveTo(-s.len * 0.18, -s.wid * 0.14);
      ctx.lineTo(s.len * 0.26, s.wid * 0.16);
    } else {
      ctx.moveTo(-s.len * 0.08, -s.wid * 0.08);
      ctx.lineTo(s.len * 0.12, s.wid * 0.06);
    }
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.36})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawShards(dom, runtime, t) {
  const { state, phaseTimes } = runtime;
  const phase = getPhase(phaseTimes, t);
  let fadeMul = 1;

  if (phase === "flash") {
    const k = clamp((t - phaseTimes.T_GATHER) / phaseTimes.P.flash, 0, 1);
    fadeMul = 1 - easeOutCubic(k);
  } else if (phase === "logo" || phase === "done") {
    fadeMul = 0;
  }

  const far = [];
  const mid = [];
  const near = [];

  for (const s of state.shards) {
    if (s.dead) continue;
    if (s.depthBand === "far") far.push(s);
    else if (s.depthBand === "mid") mid.push(s);
    else near.push(s);
  }

  for (const s of far) drawSingleShard(dom, s, fadeMul * 0.92);
  for (const s of mid) drawSingleShard(dom, s, fadeMul);
  for (const s of near) drawSingleShard(dom, s, fadeMul * 1.06);

  for (const s of state.inflow) {
    if (!s.dead) drawSingleShard(dom, s, fadeMul * 0.9);
  }
}