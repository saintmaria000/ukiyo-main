// assets/js/entrance/water.js

import { CONFIG, DEFAULT_MOVE_PROFILE } from "./config.js";
import { clamp, rand, dist2 } from "./utils.js";
import { getMainBaseRadius, getWaterBounds } from "./layout.js";

export function createWaterDroplet(runtime, instanceDef, indexWithinKind) {
  const { viewport } = runtime;
  const bounds = getWaterBounds(runtime);
  const mainR = getMainBaseRadius(runtime);
  const r = instanceDef.radius;

  const gapMap = CONFIG.water.aux.spawnGapFromMain;
  const gap =
    typeof gapMap === "number"
      ? gapMap
      : (gapMap[instanceDef.name] ?? 16);

  const safeMargin = 10;
  const minDistFromMain = mainR + r + gap;

  let distMinMul = 1.1;
  let distMaxMul = 1.4;

  if (instanceDef.name === "auxA") {
    distMinMul = 1.05;
    distMaxMul = 1.22;
  } else if (instanceDef.name === "auxB") {
    distMinMul = 1.2;
    distMaxMul = 1.6;
  } else {
    distMinMul = 1.3;
    distMaxMul = 2.2;
  }

  let placed = false;
  let x = viewport.cx;
  let y = viewport.cy;

  for (let i = 0; i < 120; i++) {
    const angle = rand(0, Math.PI * 2);
    const distMul = rand(distMinMul, distMaxMul);
    const dist = minDistFromMain * distMul;

    const tx = viewport.cx + Math.cos(angle) * dist;
    const ty = viewport.cy + Math.sin(angle) * dist;

    const insideX =
      tx >= bounds.minX + r + safeMargin &&
      tx <= bounds.maxX - r - safeMargin;

    const insideY =
      ty >= bounds.minY + r + safeMargin &&
      ty <= bounds.maxY - r - safeMargin;

    if (insideX && insideY) {
      x = tx;
      y = ty;
      placed = true;
      break;
    }
  }

  if (!placed) {
    const fallbackAngle = rand(0, Math.PI * 2);
    const fallbackDist = minDistFromMain * distMinMul;

    x = clamp(
      viewport.cx + Math.cos(fallbackAngle) * fallbackDist,
      bounds.minX + r + safeMargin,
      bounds.maxX - r - safeMargin
    );

    y = clamp(
      viewport.cy + Math.sin(fallbackAngle) * fallbackDist,
      bounds.minY + r + safeMargin,
      bounds.maxY - r - safeMargin
    );
  }

  const launchAngle = rand(0, Math.PI * 2);
  const anchorAngle = Math.atan2(y - viewport.cy, x - viewport.cx);
  const anchorDist = dist2(x, y, viewport.cx, viewport.cy);

  return {
    name: instanceDef.name,
    r,
    alpha: instanceDef.alpha,
    x,
    y,
    vx: Math.cos(launchAngle) * rand(0.18, 0.9),
    vy: Math.sin(launchAngle) * rand(0.14, 0.82),
    scale: 1,
    life: 0,
    seed: rand(0, 1000),
    indexWithinKind,

    moveProfile: instanceDef.moveProfile || DEFAULT_MOVE_PROFILE,

    anchorAngle,
    anchorDist,
    orbitDir: Math.random() < 0.5 ? -1 : 1,
    targetBias: rand(0.88, 1.16),

    driftTargetX: x,
    driftTargetY: y,
    driftTargetTimer: rand(0.9, 2.4)
  };
}

export function initWaterDroplets(runtime) {
  const { state } = runtime;
  state.water.auxDroplets.length = 0;

  const instances = CONFIG.water.aux.instances || [];
  for (let i = 0; i < instances.length; i++) {
    state.water.auxDroplets.push(createWaterDroplet(runtime, instances[i], i));
  }
}

export function getMainMorph(runtime, time, hintK) {
  const C = CONFIG.water.main;
  const base = getMainBaseRadius(runtime);

  const wobble =
    Math.sin(time * C.wobbleSpeedA) * 0.55 +
    Math.sin(time * C.wobbleSpeedB + 1.4) * 0.45;

  const ripple =
    Math.sin(time * 3.2 + 0.7) * 0.4 +
    Math.sin(time * 4.9 - 0.9) * 0.23;

  const amp = C.wobbleAmp * (1 + 0.22 * wobble);
  const shiver = hintK * 0.05;

  return {
    r: base,
    rx: base * (1.0 + amp * 0.55 + shiver + ripple * C.rippleAmpA),
    ry: base * (1.08 - amp * 0.4 - shiver * 0.65 + wobble * C.rippleAmpB),
    warpA: amp + shiver * 0.9,
    warpB: amp * 0.7 + shiver * 0.7
  };
}

export function getAuxMorph(d, time) {
  const V = CONFIG.water.aux.visual;
  const local =
    Math.sin(time * V.wobbleSpeedA + d.seed) * 0.55 +
    Math.sin(time * V.wobbleSpeedB + d.seed * 0.6) * 0.45;

  const rr = d.r * d.scale;
  const amp = V.wobbleAmp * (1 + local * 0.12);

  return {
    r: rr,
    rx: rr * (1 + amp * 0.22),
    ry: rr * (1.05 - amp * 0.16),
    warpA: amp * 0.75,
    warpB: amp * 0.52
  };
}

export function getPairContactK(ax, ay, ar, bx, by, br) {
  const d = dist2(ax, ay, bx, by);
  const rr = ar + br;

  const start = rr * CONFIG.water.contact.contactStartMul;
  const full = rr * CONFIG.water.contact.contactFullMul;

  if (d >= start) return 0;
  return clamp((start - d) / Math.max(start - full, 1), 0, 1);
}

export function getMainVisualContactForAux(runtime, d) {
  const { viewport } = runtime;
  const k = getPairContactK(
    d.x,
    d.y,
    d.r * d.scale,
    viewport.cx,
    viewport.cy,
    getMainBaseRadius(runtime)
  );

  if (k <= 0) return null;

  return {
    pullX: viewport.cx - d.x,
    pullY: viewport.cy - d.y,
    pullStrength: k * 0.92,
    squash: k * 0.52,
    neckWidth: k * 0.95
  };
}

export function getAuxVisualContactForAux(runtime, d) {
  const { state } = runtime;
  let best = null;
  let bestK = 0;

  for (const other of state.water.auxDroplets) {
    if (other === d) continue;

    const k = getPairContactK(
      d.x,
      d.y,
      d.r * d.scale,
      other.x,
      other.y,
      other.r * other.scale
    );

    if (k > bestK) {
      bestK = k;
      best = other;
    }
  }

  if (!best || bestK <= 0) return null;

  return {
    pullX: best.x - d.x,
    pullY: best.y - d.y,
    pullStrength: bestK * 0.96,
    squash: bestK * 0.56,
    neckWidth: bestK * 0.98
  };
}

export function getVisualDeformationForAux(runtime, d) {
  const mainDef = getMainVisualContactForAux(runtime, d);
  const pairDef = getAuxVisualContactForAux(runtime, d);

  if (!mainDef && !pairDef) return null;
  if (mainDef && !pairDef) return mainDef;
  if (!mainDef && pairDef) return pairDef;

  return mainDef.pullStrength >= pairDef.pullStrength ? mainDef : pairDef;
}

export function getVisualDeformationForMain(runtime) {
  const { state, viewport } = runtime;
  let best = null;
  let bestK = 0;

  for (const d of state.water.auxDroplets) {
    const k = getPairContactK(
      viewport.cx,
      viewport.cy,
      getMainBaseRadius(runtime),
      d.x,
      d.y,
      d.r * d.scale
    );

    if (k > bestK) {
      bestK = k;
      best = d;
    }
  }

  if (!best || bestK <= 0) return null;

  return {
    pullX: best.x - viewport.cx,
    pullY: best.y - viewport.cy,
    pullStrength: bestK * 0.9,
    squash: bestK * 0.48,
    neckWidth: bestK * 0.92
  };
}

export function buildDropletPathAt(
  x,
  y,
  m,
  time,
  seed = 0,
  deformation = null
) {
  const pts = [];
  const n = 72;

  const def = deformation || {};
  const pullX = def.pullX || 0;
  const pullY = def.pullY || 0;
  const pullStrength = def.pullStrength || 0;
  const squash = def.squash || 0;
  const neckWidth = def.neckWidth || 0;

  const pullLen = Math.hypot(pullX, pullY) || 1;
  const pnx = pullX / pullLen;
  const pny = pullY / pullLen;

  const calm = 1 - clamp(pullStrength * 0.6, 0, 0.6);

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);

    const n1 =
      Math.sin(a * 3 + time * 1.7 + seed) * m.warpA * 0.12 * calm;
    const n2 =
      Math.sin(a * 5 - time * 2.4 + 0.6 + seed * 0.7) *
      m.warpB *
      0.08 *
      calm;
    const n3 =
      Math.cos(a * 2 + time * 1.1 - 0.8 + seed * 0.3) *
      0.03 *
      (0.75 + calm * 0.25);

    let rr = 1 + n1 + n2 + n3;

    const along = ux * pnx + uy * pny;
    const frontPull = Math.max(0, along);
    const backPull = Math.max(0, -along);
    const side = 1 - Math.abs(along);

    rr += frontPull * frontPull * pullStrength * 0.48;
    rr -= backPull * squash * 0.1;
    rr -= side * neckWidth * 0.11;
    rr += side * pullStrength * 0.02;

    pts.push({
      x: x + ux * m.rx * rr,
      y: y + uy * m.ry * rr
    });
  }

  return pts;
}

export function limitDropletSpeed(d) {
  const baseMaxV = CONFIG.water.aux.motion.maxSpeed;
  const maxV = baseMaxV * (d.moveProfile?.maxSpeedMul || 1);

  const len = Math.hypot(d.vx, d.vy);
  if (len > maxV) {
    d.vx = (d.vx / len) * maxV;
    d.vy = (d.vy / len) * maxV;
  }
}

export function applyWaterBounds(runtime, d, bounds) {
  const base = CONFIG.water.aux.wall;
  const mp = d.moveProfile || DEFAULT_MOVE_PROFILE;

  const wallBounce = base.wallBounce * (mp.wallBounceMul || 1);
  const wallDamping = base.wallDamping * (mp.wallDampingMul || 1);

  const r = d.r;

  if (d.x < bounds.minX + r) {
    d.x = bounds.minX + r;
    d.vx = Math.abs(d.vx) * wallBounce;
    d.vy *= wallDamping;
  } else if (d.x > bounds.maxX - r) {
    d.x = bounds.maxX - r;
    d.vx = -Math.abs(d.vx) * wallBounce;
    d.vy *= wallDamping;
  }

  if (d.y < bounds.minY + r) {
    d.y = bounds.minY + r;
    d.vy = Math.abs(d.vy) * wallBounce;
    d.vx *= wallDamping;
  } else if (d.y > bounds.maxY - r) {
    d.y = bounds.maxY - r;
    d.vy = -Math.abs(d.vy) * wallBounce;
    d.vx *= wallDamping;
  }
}

export function pushOutsideMain(runtime, d) {
  const { viewport } = runtime;
  const mainR = getMainBaseRadius(runtime);
  const gapMap = CONFIG.water.aux.spawnGapFromMain;
  const gap =
    typeof gapMap === "number"
      ? gapMap
      : (gapMap[d.name] ?? 16);

  const minDist = mainR + d.r + gap;
  const dx = d.x - viewport.cx;
  const dy = d.y - viewport.cy;
  const dist = Math.hypot(dx, dy) || 1;

  if (dist < minDist) {
    const nx = dx / dist;
    const ny = dy / dist;
    d.x = viewport.cx + nx * minDist;
    d.y = viewport.cy + ny * minDist;
    d.vx += nx * 0.65;
    d.vy += ny * 0.65;
  }
}

export function applyAuxSeparation(runtime, d) {
  const { state } = runtime;
  const M = CONFIG.water.aux.motion;
  const mp = d.moveProfile || DEFAULT_MOVE_PROFILE;

  let pushX = 0;
  let pushY = 0;

  for (const other of state.water.auxDroplets) {
    if (other === d) continue;

    const dx = d.x - other.x;
    const dy = d.y - other.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const desired = (d.r + other.r) * M.separationRangeMul;

    if (dist < desired) {
      const k = 1 - dist / desired;
      pushX += (dx / dist) * k;
      pushY += (dy / dist) * k;
    }
  }

  d.vx += pushX * M.separationForce * (mp.separationMul || 1);
  d.vy += pushY * M.separationForce * (mp.separationMul || 1);
}

export function updateWaterDroplets(runtime, dt, tsSec) {
  const { viewport, anim, state } = runtime;
  if (anim.started) return;

  const bounds = getWaterBounds(runtime);
  const C = CONFIG.water.aux.motion;

  for (const d of state.water.auxDroplets) {
    d.life += dt;

    const mp = d.moveProfile || DEFAULT_MOVE_PROFILE;
    const nf = mp.noiseFreqMul || 1;

    d.driftTargetTimer -= dt;
    if (d.driftTargetTimer <= 0) {
      const orbitBase =
        d.anchorAngle + Math.sin(tsSec * 0.55 + d.seed * 0.13) * 0.42;
      const orbitRadius =
        d.anchorDist *
        (0.94 + Math.sin(tsSec * 0.38 + d.seed * 0.21) * 0.1);

      d.driftTargetX = clamp(
        viewport.cx + Math.cos(orbitBase) * orbitRadius,
        bounds.minX + d.r,
        bounds.maxX - d.r
      );

      d.driftTargetY = clamp(
        viewport.cy + Math.sin(orbitBase) * orbitRadius,
        bounds.minY + d.r,
        bounds.maxY - d.r
      );

      d.driftTargetTimer = rand(0.8, 2.1);
    }

    const flowX =
      Math.sin(tsSec * (0.42 * nf) + d.seed * 0.73) * C.driftNoiseX +
      Math.cos(tsSec * (0.21 * nf) + d.seed * 1.12) *
        C.driftNoiseX *
        0.42;

    const flowY =
      Math.cos(tsSec * (0.36 * nf) + d.seed * 0.44) * C.driftNoiseY +
      Math.sin(tsSec * (0.19 * nf) + d.seed * 0.86) *
        C.driftNoiseY *
        0.36;

    const toTargetX = d.driftTargetX - d.x;
    const toTargetY = d.driftTargetY - d.y;
    const targetLen = Math.hypot(toTargetX, toTargetY) || 1;

    const toCenterX = viewport.cx - d.x;
    const toCenterY = viewport.cy - d.y;
    const centerLen = Math.hypot(toCenterX, toCenterY) || 1;

    const tangentialX = (-toCenterY / centerLen) * d.orbitDir;
    const tangentialY = (toCenterX / centerLen) * d.orbitDir;

    const gravity = 0.06 * (mp.gravityMul || 1);

    const horizonPull =
      d.y < viewport.horizonY - 20
        ? 0
        : (d.y - (viewport.horizonY - 20)) *
          0.0018 *
          (mp.horizonPullMul || 0);

    d.vx +=
      flowX * dt * C.driftForce * (mp.driftForceMul || 1) +
      (toTargetX / targetLen) *
        dt *
        C.targetPull *
        (mp.targetPullMul || 1) *
        d.targetBias +
      tangentialX * dt * C.tangentialForce * (mp.tangentialMul || 1) +
      (toCenterX / centerLen) * dt * C.centerBias * (mp.centerBiasMul || 1);

    d.vy +=
      flowY * dt * C.driftForce * (mp.driftForceMul || 1) +
      (toTargetY / targetLen) *
        dt *
        C.targetPull *
        (mp.targetPullMul || 1) *
        d.targetBias +
      tangentialY * dt * C.tangentialForce * (mp.tangentialMul || 1) +
      (toCenterY / centerLen) * dt * C.centerBias * (mp.centerBiasMul || 1) +
      gravity +
      horizonPull;

    applyAuxSeparation(runtime, d);

    d.vx *= C.driftDamping;
    d.vy *= C.driftDamping;

    limitDropletSpeed(d);

    d.x += d.vx * dt;
    d.y += d.vy * dt;

    pushOutsideMain(runtime, d);
    applyWaterBounds(runtime, d, bounds);
  }
}

export function tracePath(ctx, pts) {
  if (!pts || pts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 2; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  ctx.quadraticCurveTo(
    pts[pts.length - 1].x,
    pts[pts.length - 1].y,
    pts[0].x,
    pts[0].y
  );
  ctx.closePath();
}

export function getRenderPathForDroplet(item, time) {
  return buildDropletPathAt(
    item.x,
    item.y,
    item.morph,
    time,
    item.seed,
    item.deformation || null
  );
}

export function getMainRenderDroplet(runtime, time, hintK) {
  const { viewport } = runtime;
  const morph = getMainMorph(runtime, time, hintK);
  const deformation = getVisualDeformationForMain(runtime);

  return {
    id: "main",
    type: "main",
    x: viewport.cx,
    y: viewport.cy,
    r: morph.r,
    rx: morph.rx,
    ry: morph.ry,
    alpha: 1,
    seed: 0,
    morph,
    deformation
  };
}

export function getAuxRenderDroplets(runtime, time) {
  const { state } = runtime;

  return state.water.auxDroplets.map((d, i) => {
    const morph = getAuxMorph(d, time);
    const deformation = getVisualDeformationForAux(runtime, d);

    return {
      id: `aux-${i}`,
      type: "aux",
      source: d,
      x: d.x,
      y: d.y,
      r: morph.r,
      rx: morph.rx,
      ry: morph.ry,
      alpha: d.alpha,
      seed: d.seed,
      morph,
      deformation
    };
  });
}

export function shouldMetaballJoin(a, b) {
  const d = dist2(a.x, a.y, b.x, b.y);
  const rr = a.r + b.r;
  return d <= rr * CONFIG.water.metaball.joinMul;
}

export function buildDropletGroups(items) {
  const n = items.length;
  const visited = new Array(n).fill(false);
  const groups = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;

    const stack = [i];
    visited[i] = true;
    const group = [];

    while (stack.length) {
      const idx = stack.pop();
      const a = items[idx];
      group.push(a);

      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const b = items[j];
        if (shouldMetaballJoin(a, b)) {
          visited[j] = true;
          stack.push(j);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

export function getGroupBounds(group) {
  const pad = CONFIG.water.metaball.pad + CONFIG.water.metaball.blur;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const d of group) {
    minX = Math.min(minX, d.x - d.rx - pad);
    minY = Math.min(minY, d.y - d.ry - pad);
    maxX = Math.max(maxX, d.x + d.rx + pad);
    maxY = Math.max(maxY, d.y + d.ry + pad);
  }

  return {
    minX: Math.floor(minX),
    minY: Math.floor(minY),
    maxX: Math.ceil(maxX),
    maxY: Math.ceil(maxY),
    w: Math.max(1, Math.ceil(maxX - minX)),
    h: Math.max(1, Math.ceil(maxY - minY))
  };
}

export function buildMetaballMask(runtime, group, time) {
  const { state } = runtime;
  const off = state.water.metaballMaskCanvas;
  const octx = state.water.metaballMaskCtx;
  const blur = CONFIG.water.metaball.blur;
  const threshold = CONFIG.water.metaball.threshold;
  const b = getGroupBounds(group);

  off.width = b.w;
  off.height = b.h;

  octx.clearRect(0, 0, b.w, b.h);

  octx.save();
  octx.fillStyle = "#fff";
  octx.filter = `blur(${blur}px)`;

  for (const item of group) {
    const pts = getRenderPathForDroplet(item, time).map((p) => ({
      x: p.x - b.minX,
      y: p.y - b.minY
    }));

    tracePath(octx, pts);
    octx.fill();
  }

  octx.restore();

  const img = octx.getImageData(0, 0, b.w, b.h);
  const data = img.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a >= threshold) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  octx.putImageData(img, 0, 0);
  return b;
}

export function buildMetaballComposite(runtime, group, hintK, time) {
  const { state } = runtime;
  const bounds = buildMetaballMask(runtime, group, time);

  const maskCanvas = state.water.metaballMaskCanvas;
  const compCanvas = state.water.metaballCompositeCanvas;
  const cctx = state.water.metaballCompositeCtx;

  compCanvas.width = bounds.w;
  compCanvas.height = bounds.h;

  cctx.clearRect(0, 0, bounds.w, bounds.h);

  const centerX = bounds.w * 0.5;
  const centerY = bounds.h * 0.5;
  const radius = Math.max(bounds.w, bounds.h) * 0.58;

  const body = cctx.createRadialGradient(
    centerX - radius * 0.18,
    centerY - radius * 0.22,
    4,
    centerX,
    centerY,
    radius
  );
  body.addColorStop(0, "rgba(255,255,255,0.10)");
  body.addColorStop(0.28, "rgba(255,255,255,0.050)");
  body.addColorStop(0.62, "rgba(255,255,255,0.020)");
  body.addColorStop(1, "rgba(255,255,255,0.006)");

  cctx.fillStyle = body;
  cctx.fillRect(0, 0, bounds.w, bounds.h);

  cctx.globalCompositeOperation = "destination-in";
  cctx.drawImage(maskCanvas, 0, 0);

  cctx.globalCompositeOperation = "source-over";
  cctx.globalAlpha = 0.11 + hintK * 0.035;
  cctx.drawImage(maskCanvas, 0, 0);
  cctx.globalAlpha = 1;

  cctx.globalCompositeOperation = "lighter";
  for (const item of group) {
    cctx.beginPath();
    cctx.ellipse(
      (item.x - bounds.minX) - item.rx * 0.18,
      (item.y - bounds.minY) - item.ry * 0.22,
      Math.max(1.5, item.rx * 0.18),
      Math.max(2.2, item.ry * 0.24),
      -0.35,
      0,
      Math.PI * 2
    );
    cctx.fillStyle = "rgba(255,255,255,0.040)";
    cctx.fill();
  }

  cctx.globalCompositeOperation = "source-over";
  return bounds;
}

export function drawMetaballGroup(dom, runtime, group, hintK, time) {
  const { ctx } = dom;
  const bounds = buildMetaballComposite(runtime, group, hintK, time);

  ctx.save();
  ctx.drawImage(
    runtime.state.water.metaballCompositeCanvas,
    bounds.minX,
    bounds.minY
  );
  ctx.restore();
}

export function drawWaterDropletSystem(dom, runtime, time, hintK) {
  const mainItem = getMainRenderDroplet(runtime, time, hintK);
  const auxItems = getAuxRenderDroplets(runtime, time);
  const items = [mainItem, ...auxItems];
  const groups = buildDropletGroups(items);

  for (const group of groups) {
    drawMetaballGroup(dom, runtime, group, hintK, time);
  }
}