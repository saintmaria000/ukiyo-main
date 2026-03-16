// assets/js/entrance.js
(() => {
  "use strict";

  /* =========================================================
     Sector 01. DOM / Base
  ========================================================= */
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const brand = document.querySelector(".brand");
  const revealLogo = document.getElementById("revealLogo");
  const entranceGate = document.getElementById("entranceGate");

  /* =========================================================
     Sector 02. Config / 可変値
     - 水滴系は現行動作用の暫定版を維持
     - revealLogo は「落下 → 単発バウンド → 固定」に修正
  ========================================================= */
  const CONFIG = {
    bg: "#000000",

    horizonYMin: 0.58,
    horizonYMax: 0.62,

    droplet: {
      radius: 104,
      wobbleAmp: 0.105,
      wobbleSpeedA: 0.92,
      wobbleSpeedB: 1.42,
      floatY: -54,

      absorbPulseAmp: 0.0,
      absorbPulseDecay: 1.35
    },

    auxDroplets: {
      sizeRatioLarge: 0.382,
      sizeRatioMedium: 0.236,
      sizeRatioSmall: 0.092,
      maxRadiusRatioToMain: 0.5,

      minTotalCount: 2,
      maxTotalCount: 4,
      minAuxCount: 1,
      maxAuxCount: 3,

      initialPattern: ["medium", "small"],

      bounds: {
        sideInset: 18,
        topOffset: 0,
        bottomInsetFromFilm: -14
      },

      driftForce: 2.12,
      driftDamping: 0.993,
      driftNoiseX: 2.9,
      driftNoiseY: 2.25,
      maxSpeed: 18.0,

      stableDistLarge: 1.72,
      stableDistMedium: 1.48,
      stableDistSmall: 1.28,
      stableDistJitter: 0.08,

      contactStartMul: 1.78,
      contactFullMul: 1.08,
      mainContactMax: 1,

      metaballJoinMul: 1.62,
      metaballThreshold: 132,
      metaballBlur: 14,
      metaballPad: 34,

      wallBounce: 0.92,
      wallDamping: 0.86
    },

    phase: {
      hint: 0.15,
      burst: 1.0,
      drift: 0.5,
      gather: 1.08,
      flash: 0.34,
      logo: 1.28
    },

    logoHoldAfterReveal: 1.42,

    reveal: {
      dropFromY: -148,
      dropOvershoot: 18,
      bounceBackY: -10,
      dropDuration: 0.68,
      bounceDuration: 0.24,
      startScale: 0.93,
      impactScale: 1.02,
      finalScale: 1.0
    },

    shardCount: 160,
    shardNearRatio: 0.16,
    shardMidRatio: 0.60,
    shardFarRatio: 0.24,
    gravityInflowCount: 36,

    spreadBoost: 1.9,
    offscreenBoost: 1.45,
    centerRetention: 0.42,
    midRetention: 0.28,

    gatherMaxPull: 2350,
    gatherInflowPull: 2650,
    gatherSteer: 5.4,
    gatherZSteer: 4.0,
    gatherSnapRadius: 30,
    gatherSnapRadiusNear: 38,
    vanishRadius: 5,
    vanishRadiusNear: 7,
    vanishZ: 6,
    vanishZInflow: 12
  };

  /* =========================================================
     Sector 03. Media Query
  ========================================================= */
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePortraitQuery = window.matchMedia("(pointer: coarse) and (orientation: portrait)");

  /* =========================================================
     Sector 04. Runtime State
  ========================================================= */
  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cx = 0;
  let cy = 0;
  let horizonY = 0;

  let rafId = 0;
  let started = false;
  let finished = false;
  let startTime = 0;
  let lastTs = 0;
  let doneTimer = 0;

  const P = CONFIG.phase;
  const T_HINT = P.hint;
  const T_BURST = T_HINT + P.burst;
  const T_DRIFT = T_BURST + P.drift;
  const T_GATHER = T_DRIFT + P.gather;
  const T_FLASH = T_GATHER + P.flash;
  const T_LOGO = T_FLASH + P.logo;

  const state = {
    shards: [],
    inflow: [],
    flash: 0,
    revealShown: false,
    entranceDoneFired: false,

    auxDroplets: [],
    mainAbsorbPulse: 0,

    metaballCanvas: document.createElement("canvas"),
    metaballCtx: null
  };

  state.metaballCtx = state.metaballCanvas.getContext("2d", {
    willReadFrequently: true
  });

  /* =========================================================
     Sector 05. Utils
  ========================================================= */
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInExpo(t) {
    t = clamp(t, 0, 1);
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  }

  function easeOutExpo(t) {
    t = clamp(t, 0, 1);
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function easeInOutCubic(t) {
    t = clamp(t, 0, 1);
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function choose(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function dist2(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function rectSize(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return r;
  }

  /* =========================================================
     Sector 06. Resize / Layout
  ========================================================= */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = w * 0.5;
    cy = h * 0.5 + CONFIG.droplet.floatY;
    horizonY = h * lerp(CONFIG.horizonYMin, CONFIG.horizonYMax, 0.5);

    if (!started) {
      createShardField();
      initAuxDroplets();
    }
  }

  function getMainBaseRadius() {
    return CONFIG.droplet.radius * Math.min(w / 1200, h / 900, 1.12);
  }

  function getFloatBounds() {
    const C = CONFIG.auxDroplets;
    const rect = rectSize(brand);
    const mainR = getMainBaseRadius();

    const brandW = rect ? rect.width : Math.min(w * 0.28, 360);
    const brandH = rect ? rect.height : mainR * 0.92;

    const left = cx - brandW * 0.5 + C.bounds.sideInset;
    const right = cx + brandW * 0.5 - C.bounds.sideInset;
    const top = cy - mainR * 1.2 + C.bounds.topOffset;
    const filmBaseline = rect ? rect.bottom : cy + brandH * 0.5;
    const bottom = filmBaseline - C.bounds.bottomInsetFromFilm;

    return {
      minX: left,
      maxX: right,
      minY: top,
      maxY: bottom
    };
  }

  /* =========================================================
     Sector 07. Shards / Generate
  ========================================================= */
  function createShardField() {
    state.shards.length = 0;
    state.inflow.length = 0;

    const total = CONFIG.shardCount;
    const nearN = Math.round(total * CONFIG.shardNearRatio);
    const midN = Math.round(total * CONFIG.shardMidRatio);
    const farN = total - nearN - midN;

    for (let i = 0; i < nearN; i++) state.shards.push(createShard("near"));
    for (let i = 0; i < midN; i++) state.shards.push(createShard("mid"));
    for (let i = 0; i < farN; i++) state.shards.push(createShard("far"));

    for (let i = 0; i < CONFIG.gravityInflowCount; i++) {
      state.inflow.push(createInflowShard());
    }
  }

  function createShard(depthBand) {
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

    return {
      type: isFlat ? "flat" : "needle",
      depthBand,
      depth,
      x: cx,
      y: cy,
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
      dead: false
    };
  }

  function createInflowShard() {
    const side = choose(["top", "bottom", "left", "right"]);
    let x, y;

    if (side === "top") {
      x = rand(-0.35 * w, 1.35 * w);
      y = -rand(60, 320);
    } else if (side === "bottom") {
      x = rand(-0.35 * w, 1.35 * w);
      y = h + rand(60, 320);
    } else if (side === "left") {
      x = -rand(60, 340);
      y = rand(-0.2 * h, 1.2 * h);
    } else {
      x = w + rand(60, 340);
      y = rand(-0.2 * h, 1.2 * h);
    }

    const depth = rand(0.18, 0.82);
    const isFlat = Math.random() < 0.28;
    const scale = lerp(0.42, 1.55, depth);

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
      dead: false
    };
  }

  /* =========================================================
     Sector 08. Water System / Generate & Model
     - 現行動作維持版
  ========================================================= */
  function getAuxBaseRadius(kind) {
    const mainR = getMainBaseRadius();
    if (kind === "large") return mainR * CONFIG.auxDroplets.sizeRatioLarge;
    if (kind === "medium") return mainR * CONFIG.auxDroplets.sizeRatioMedium;
    return mainR * CONFIG.auxDroplets.sizeRatioSmall;
  }

  function clampAuxRadius(r) {
    const mainR = getMainBaseRadius();
    return clamp(r, mainR * 0.06, mainR * CONFIG.auxDroplets.maxRadiusRatioToMain);
  }

  function getStableDistanceForKind(kind) {
    const mainR = getMainBaseRadius();
    const C = CONFIG.auxDroplets;
    const mul =
      kind === "large" ? C.stableDistLarge :
      kind === "medium" ? C.stableDistMedium :
      C.stableDistSmall;

    return mainR * (mul + rand(-C.stableDistJitter, C.stableDistJitter));
  }

  function initAuxDroplets() {
    state.auxDroplets.length = 0;
    state.mainAbsorbPulse = 0;

    const kinds = CONFIG.auxDroplets.initialPattern;
    const bounds = getFloatBounds();

    for (let i = 0; i < kinds.length; i++) {
      const angle = Math.random() * Math.PI * 2;
      const minDist = getMainBaseRadius() * 0.9;
      const maxDist = getMainBaseRadius() * 1.8;
      const dist = rand(minDist, maxDist);

      let x = cx + Math.cos(angle) * dist;
      let y = cy + Math.sin(angle) * dist;

      x = clamp(x, bounds.minX, bounds.maxX);
      y = clamp(y, bounds.minY, bounds.maxY);

      const tangent = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);

      state.auxDroplets.push({
        kind: kinds[i],
        r: clampAuxRadius(getAuxBaseRadius(kinds[i])),
        x,
        y,
        vx: Math.cos(tangent) * rand(3, 5),
        vy: Math.sin(tangent) * rand(2, 4),
        alpha: 0.9,
        scale: 1,
        life: 0,
        seed: rand(0, 1000)
      });
    }
  }

  function limitDropletSpeed(d) {
    const maxV = CONFIG.auxDroplets.maxSpeed;
    const len = Math.hypot(d.vx, d.vy);
    if (len > maxV) {
      d.vx = (d.vx / len) * maxV;
      d.vy = (d.vy / len) * maxV;
    }
  }

  function applyWallBounce(d, bounds) {
    const C = CONFIG.auxDroplets;

    if (d.x < bounds.minX) {
      d.x = bounds.minX;
      d.vx = Math.abs(d.vx) * C.wallBounce;
      d.vy *= C.wallDamping;
    } else if (d.x > bounds.maxX) {
      d.x = bounds.maxX;
      d.vx = -Math.abs(d.vx) * C.wallBounce;
      d.vy *= C.wallDamping;
    }

    if (d.y < bounds.minY) {
      d.y = bounds.minY;
      d.vy = Math.abs(d.vy) * C.wallBounce;
      d.vx *= C.wallDamping;
    } else if (d.y > bounds.maxY) {
      d.y = bounds.maxY;
      d.vy = -Math.abs(d.vy) * C.wallBounce;
      d.vx *= C.wallDamping;
    }
  }

  /* =========================================================
     Sector 09. Phase
  ========================================================= */
  function getPhase(t) {
    if (t < T_HINT) return "hint";
    if (t < T_BURST) return "burst";
    if (t < T_DRIFT) return "drift";
    if (t < T_GATHER) return "gather";
    if (t < T_FLASH) return "flash";
    if (t < T_LOGO) return "logo";
    return "done";
  }

  /* =========================================================
     Sector 10. Water System / Update
  ========================================================= */
  function updateAuxDroplets(dt, tsSec) {
    if (started) return;

    const C = CONFIG.auxDroplets;
    const bounds = getFloatBounds();

    for (const d of state.auxDroplets) {
      d.life += dt;

      const noiseX =
        Math.sin(tsSec * 0.36 + d.seed * 0.63) * C.driftNoiseX +
        Math.sin(tsSec * 0.71 + d.seed * 1.11) * C.driftNoiseX * 0.32;

      const noiseY =
        Math.cos(tsSec * 0.41 + d.seed * 0.47) * C.driftNoiseY +
        Math.sin(tsSec * 0.76 + d.seed * 0.81) * C.driftNoiseY * 0.22;

      d.vx += noiseX * dt * C.driftForce;
      d.vy += noiseY * dt * C.driftForce;

      d.vx *= C.driftDamping;
      d.vy *= C.driftDamping;

      limitDropletSpeed(d);

      d.x += d.vx * dt;
      d.y += d.vy * dt;

      applyWallBounce(d, bounds);
    }
  }

  function getPairContactK(ax, ay, ar, bx, by, br) {
    const d = dist2(ax, ay, bx, by);
    const rr = ar + br;

    const start = rr * CONFIG.auxDroplets.contactStartMul;
    const full = rr * CONFIG.auxDroplets.contactFullMul;

    if (d >= start) return 0;
    return clamp((start - d) / Math.max(start - full, 1), 0, 1);
  }

  function getMainVisualContactForAux(d) {
    const k = getPairContactK(
      d.x, d.y, d.r * d.scale,
      cx, cy, getMainBaseRadius()
    );

    if (k <= 0) return null;

    return {
      pullX: cx - d.x,
      pullY: cy - d.y,
      pullStrength: k * 0.92,
      squash: k * 0.52,
      neckWidth: k * 0.95
    };
  }

  function getAuxVisualContactForAux(d) {
    let best = null;
    let bestK = 0;

    for (const other of state.auxDroplets) {
      if (other === d) continue;

      const k = getPairContactK(
        d.x, d.y, d.r * d.scale,
        other.x, other.y, other.r * other.scale
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

  function getVisualDeformationForAux(d) {
    const mainDef = getMainVisualContactForAux(d);
    const pairDef = getAuxVisualContactForAux(d);

    if (!mainDef && !pairDef) return null;
    if (mainDef && !pairDef) return mainDef;
    if (!mainDef && pairDef) return pairDef;

    return mainDef.pullStrength >= pairDef.pullStrength ? mainDef : pairDef;
  }

  function getVisualDeformationForMain() {
    let best = null;
    let bestK = 0;

    for (const d of state.auxDroplets) {
      const k = getPairContactK(
        cx, cy, getMainBaseRadius(),
        d.x, d.y, d.r * d.scale
      );

      if (k > bestK) {
        bestK = k;
        best = d;
      }
    }

    if (!best || bestK <= 0) return null;

    return {
      pullX: best.x - cx,
      pullY: best.y - cy,
      pullStrength: bestK * 0.9,
      squash: bestK * 0.48,
      neckWidth: bestK * 0.92
    };
  }

  function getDropletMorph(time, hintK) {
    const base = getMainBaseRadius();
    const absorbPulse = state.mainAbsorbPulse * CONFIG.droplet.absorbPulseAmp;

    const wobble =
      Math.sin(time * CONFIG.droplet.wobbleSpeedA) * 0.55 +
      Math.sin(time * CONFIG.droplet.wobbleSpeedB + 1.4) * 0.45;

    const ripple =
      Math.sin(time * 3.2 + 0.7) * 0.4 +
      Math.sin(time * 4.9 - 0.9) * 0.23;

    const amp = CONFIG.droplet.wobbleAmp * (1 + 0.22 * wobble) + absorbPulse;
    const shiver = hintK * 0.05;

    return {
      r: base,
      rx: base * (1.0 + amp * 0.55 + shiver + ripple * 0.012),
      ry: base * (1.08 - amp * 0.4 - shiver * 0.65 + wobble * 0.01),
      warpA: amp + shiver * 0.9,
      warpB: amp * 0.7 + shiver * 0.7
    };
  }

  function getAuxMorph(d, time) {
    const local =
      Math.sin(time * 1.18 + d.seed) * 0.55 +
      Math.sin(time * 1.84 + d.seed * 0.6) * 0.45;

    const rr = d.r * d.scale;
    const amp = 0.11 * (1 + local * 0.12);

    return {
      r: rr,
      rx: rr * (1 + amp * 0.22),
      ry: rr * (1.05 - amp * 0.16),
      warpA: amp * 0.75,
      warpB: amp * 0.52
    };
  }

  function buildDropletPathAt(x, y, m, time, seed = 0, deformation = null) {
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

      const n1 = Math.sin(a * 3 + time * 1.7 + seed) * m.warpA * 0.12 * calm;
      const n2 = Math.sin(a * 5 - time * 2.4 + 0.6 + seed * 0.7) * m.warpB * 0.08 * calm;
      const n3 = Math.cos(a * 2 + time * 1.1 - 0.8 + seed * 0.3) * 0.03 * (0.75 + calm * 0.25);

      let rr = 1 + n1 + n2 + n3;

      const along = ux * pnx + uy * pny;
      const frontPull = Math.max(0, along);
      const backPull = Math.max(0, -along);
      const side = 1 - Math.abs(along);

      rr += frontPull * frontPull * pullStrength * 0.48;
      rr -= backPull * squash * 0.10;
      rr -= side * neckWidth * 0.11;
      rr += side * pullStrength * 0.02;

      pts.push({
        x: x + ux * m.rx * rr,
        y: y + uy * m.ry * rr
      });
    }

    return pts;
  }

  /* =========================================================
     Sector 11. Water System / Draw
  ========================================================= */
  function tracePath(pts) {
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

  function drawDroplet(time, hintK) {
    const deformation = getVisualDeformationForMain();

    const pts = buildDropletPathAt(
      cx,
      cy,
      getDropletMorph(time, hintK),
      time,
      0,
      deformation
    );

    ctx.save();

    const body = ctx.createRadialGradient(
      cx - 18,
      cy - 22,
      5,
      cx,
      cy,
      getMainBaseRadius() * 1.1
    );
    body.addColorStop(0, "rgba(255,255,255,0.12)");
    body.addColorStop(0.38, "rgba(255,255,255,0.055)");
    body.addColorStop(0.72, "rgba(255,255,255,0.028)");
    body.addColorStop(1, "rgba(255,255,255,0.01)");

    tracePath(pts);
    ctx.fillStyle = body;
    ctx.fill();

    const mainContactBoost = deformation ? deformation.pullStrength : 0;
    ctx.strokeStyle = `rgba(255,255,255,${0.17 + hintK * 0.08 + mainContactBoost * 0.08})`;
    ctx.lineWidth = 1.05;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 22, 9, 16, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + 6, cy + 8, 28, 17, 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  function drawAuxDroplets(time) {
    for (const d of state.auxDroplets) {
      const m = getAuxMorph(d, time);
      const deformation = getVisualDeformationForAux(d);
      const pts = buildDropletPathAt(d.x, d.y, m, time, d.seed, deformation);

      ctx.save();

      const g = ctx.createRadialGradient(
        d.x - m.r * 0.18,
        d.y - m.r * 0.22,
        1,
        d.x,
        d.y,
        m.r * 1.18
      );
      g.addColorStop(0, `rgba(255,255,255,${0.10 * d.alpha})`);
      g.addColorStop(0.42, `rgba(255,255,255,${0.046 * d.alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0.008)");

      tracePath(pts);
      ctx.fillStyle = g;
      ctx.fill();

      const contactBoost = deformation ? deformation.pullStrength : 0;
      ctx.strokeStyle = `rgba(255,255,255,${(0.15 + contactBoost * 0.08) * d.alpha})`;
      ctx.lineWidth =
        d.kind === "large" ? 1.02 :
        d.kind === "medium" ? 0.92 : 0.78;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        d.x - m.r * 0.18,
        d.y - m.r * 0.22,
        Math.max(1.3, m.r * 0.18),
        Math.max(2.0, m.r * 0.25),
        -0.34,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(255,255,255,${0.04 * d.alpha})`;
      ctx.fill();

      ctx.restore();
    }
  }

  function getMainRenderDroplet(time, hintK) {
    const m = getDropletMorph(time, hintK);
    return {
      id: "main",
      type: "main",
      x: cx,
      y: cy,
      r: m.r,
      rx: m.rx,
      ry: m.ry,
      alpha: 1,
      seed: 0
    };
  }

  function getAuxRenderDroplets(time) {
    return state.auxDroplets.map((d, i) => {
      const m = getAuxMorph(d, time);
      return {
        id: `aux-${i}`,
        type: "aux",
        source: d,
        x: d.x,
        y: d.y,
        r: m.r,
        rx: m.rx,
        ry: m.ry,
        alpha: d.alpha,
        seed: d.seed
      };
    });
  }

  function shouldMetaballJoin(a, b) {
    const d = dist2(a.x, a.y, b.x, b.y);
    const rr = a.r + b.r;
    return d <= rr * CONFIG.auxDroplets.metaballJoinMul;
  }

  function buildDropletGroups(items) {
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

  function getGroupBounds(group) {
    const pad = CONFIG.auxDroplets.metaballPad + CONFIG.auxDroplets.metaballBlur;

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

  function buildMetaballMask(group) {
    const off = state.metaballCanvas;
    const octx = state.metaballCtx;
    const blur = CONFIG.auxDroplets.metaballBlur;
    const threshold = CONFIG.auxDroplets.metaballThreshold;
    const b = getGroupBounds(group);

    off.width = b.w;
    off.height = b.h;

    octx.clearRect(0, 0, b.w, b.h);

    octx.save();
    octx.fillStyle = "#fff";
    octx.filter = `blur(${blur}px)`;

    for (const d of group) {
      octx.beginPath();
      octx.ellipse(
        d.x - b.minX,
        d.y - b.minY,
        d.rx,
        d.ry,
        0,
        0,
        Math.PI * 2
      );
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
        data[i + 3] = 0;
      }
    }

    octx.putImageData(img, 0, 0);
    return b;
  }

  function drawSingleOrganicDroplet(item, time, hintK) {
    if (item.type === "main") {
      const deformation = getVisualDeformationForMain();
      const pts = buildDropletPathAt(
        item.x,
        item.y,
        getDropletMorph(time, hintK),
        time,
        0,
        deformation
      );

      ctx.save();

      const body = ctx.createRadialGradient(
        item.x - 18,
        item.y - 22,
        5,
        item.x,
        item.y,
        getMainBaseRadius() * 1.1
      );
      body.addColorStop(0, "rgba(255,255,255,0.12)");
      body.addColorStop(0.38, "rgba(255,255,255,0.055)");
      body.addColorStop(0.72, "rgba(255,255,255,0.028)");
      body.addColorStop(1, "rgba(255,255,255,0.01)");

      tracePath(pts);
      ctx.fillStyle = body;
      ctx.fill();

      const mainContactBoost = deformation ? deformation.pullStrength : 0;
      ctx.strokeStyle = `rgba(255,255,255,${0.17 + hintK * 0.08 + mainContactBoost * 0.08})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(item.x - 18, item.y - 22, 9, 16, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(item.x + 6, item.y + 8, 28, 17, 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
      return;
    }

    const d = item.source;
    const m = getAuxMorph(d, time);
    const deformation = getVisualDeformationForAux(d);
    const pts = buildDropletPathAt(d.x, d.y, m, time, d.seed, deformation);

    ctx.save();

    const g = ctx.createRadialGradient(
      d.x - m.r * 0.18,
      d.y - m.r * 0.22,
      1,
      d.x,
      d.y,
      m.r * 1.18
    );
    g.addColorStop(0, `rgba(255,255,255,${0.10 * d.alpha})`);
    g.addColorStop(0.42, `rgba(255,255,255,${0.046 * d.alpha})`);
    g.addColorStop(1, "rgba(255,255,255,0.008)");

    tracePath(pts);
    ctx.fillStyle = g;
    ctx.fill();

    const contactBoost = deformation ? deformation.pullStrength : 0;
    ctx.strokeStyle = `rgba(255,255,255,${(0.15 + contactBoost * 0.08) * d.alpha})`;
    ctx.lineWidth =
      d.kind === "large" ? 1.02 :
      d.kind === "medium" ? 0.92 : 0.78;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      d.x - m.r * 0.18,
      d.y - m.r * 0.22,
      Math.max(1.3, m.r * 0.18),
      Math.max(2.0, m.r * 0.25),
      -0.34,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(255,255,255,${0.04 * d.alpha})`;
    ctx.fill();

    ctx.restore();
  }

  function drawMetaballGroup(group, time, hintK) {
    const bounds = buildMetaballMask(group);

    ctx.save();

    const centerX = (bounds.minX + bounds.maxX) * 0.5;
    const centerY = (bounds.minY + bounds.maxY) * 0.5;
    const radius = Math.max(bounds.w, bounds.h) * 0.58;

    const body = ctx.createRadialGradient(
      centerX - radius * 0.18,
      centerY - radius * 0.22,
      4,
      centerX,
      centerY,
      radius
    );
    body.addColorStop(0, "rgba(255,255,255,0.12)");
    body.addColorStop(0.38, "rgba(255,255,255,0.055)");
    body.addColorStop(0.72, "rgba(255,255,255,0.028)");
    body.addColorStop(1, "rgba(255,255,255,0.01)");

    ctx.drawImage(state.metaballCanvas, bounds.minX, bounds.minY);

    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = body;
    ctx.fillRect(bounds.minX, bounds.minY, bounds.w, bounds.h);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.18 + hintK * 0.05;
    ctx.drawImage(state.metaballCanvas, bounds.minX, bounds.minY);

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.08;

    for (const d of group) {
      ctx.beginPath();
      ctx.ellipse(
        d.x - d.rx * 0.18,
        d.y - d.ry * 0.22,
        Math.max(1.5, d.rx * 0.18),
        Math.max(2.2, d.ry * 0.24),
        -0.35,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();
    }

    ctx.restore();
  }

  function drawDropletSystem(time, hintK) {
    const items = [getMainRenderDroplet(time, hintK), ...getAuxRenderDroplets(time)];
    const groups = buildDropletGroups(items);

    for (const group of groups) {
      if (group.length === 1) drawSingleOrganicDroplet(group[0], time, hintK);
      else drawMetaballGroup(group, time, hintK);
    }
  }

  /* =========================================================
     Sector 12. Background / Halo / Water
  ========================================================= */
  function drawBackground(time) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CONFIG.bg;
    ctx.fillRect(0, 0, w, h);

    drawHalo(time);
    drawHorizon(time);
    drawWater(time);
  }

  function drawHalo(time) {
    const pulse = 0.93 + Math.sin(time * 1.1) * 0.03;
    const r = Math.max(w, h) * 0.16 * pulse;
    const g = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, r);
    g.addColorStop(0, "rgba(255,255,255,0.12)");
    g.addColorStop(0.33, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy - 10, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHorizon(time) {
    const lineW = w * 0.44;
    const amp = 0.8;
    const yBase = horizonY;

    const g = ctx.createLinearGradient(cx - lineW * 0.5, 0, cx + lineW * 0.5, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.18, "rgba(255,255,255,0.028)");
    g.addColorStop(0.5, "rgba(255,255,255,0.075)");
    g.addColorStop(0.82, "rgba(255,255,255,0.028)");
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = cx - lineW * 0.5;
    const endX = cx + lineW * 0.5;

    for (let x = startX; x <= endX; x += 8) {
      const local = (x - startX) / lineW;
      const centerWeight = 1 - Math.abs(local - 0.5) * 2;
      const y =
        yBase +
        Math.sin(time * 0.45 + x * 0.01) * amp * 0.5 * centerWeight +
        Math.sin(time * 0.22 + x * 0.004) * amp * 0.35;

      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  function drawWater(time) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    const g = ctx.createLinearGradient(0, horizonY, 0, h);
    g.addColorStop(0, "rgba(8,8,8,1)");
    g.addColorStop(0.08, "rgba(4,4,4,1)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    const lineCount = 10;
    for (let i = 0; i < lineCount; i++) {
      const y = horizonY + 6 + i * 8;
      const a = 0.018 * (1 - i / lineCount);
      const wave = Math.sin(time * 0.8 + i * 0.9) * 8;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.2, `rgba(255,255,255,${a * 0.35})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${a})`);
      grad.addColorStop(0.8, `rgba(255,255,255,${a * 0.35})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 22) {
        const yy = y + Math.sin(x * 0.012 + wave) * 0.8;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /* =========================================================
     Sector 13. Reflection
  ========================================================= */
  function drawReflection(time, hintK) {
    ctx.save();

    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    const items = [getMainRenderDroplet(time, hintK * 0.72), ...getAuxRenderDroplets(time)];
    const groups = buildDropletGroups(items);

    for (const group of groups) {
      if (group.length === 1) {
        drawSingleReflection(group[0], time, hintK);
      } else {
        drawMetaballReflection(group, time);
      }
    }

    ctx.restore();
  }

  function drawSingleReflection(item, time, hintK) {
    if (item.type === "main") {
      const pts = buildDropletPathAt(
        cx,
        cy,
        getDropletMorph(time, hintK * 0.72),
        time,
        0,
        getVisualDeformationForMain()
      );

      drawReflectionShape(
        pts,
        time,
        {
          bodyAlpha: 0.10,
          strokeAlpha: 0.045,
          squashY: 0.60,
          rippleAmp: 0.9,
          rippleFreq: 0.018,
          rippleSpeed: 1.2
        }
      );
      return;
    }

    const d = item.source;
    const m = getAuxMorph(d, time);
    const pts = buildDropletPathAt(
      d.x,
      d.y,
      m,
      time,
      d.seed,
      getVisualDeformationForAux(d)
    );

    drawReflectionShape(
      pts,
      time + d.seed * 0.0008,
      {
        bodyAlpha: 0.062 * d.alpha,
        strokeAlpha: 0.028 * d.alpha,
        squashY: 0.58,
        rippleAmp: Math.max(0.35, m.r * 0.018),
        rippleFreq: 0.02,
        rippleSpeed: 1.1
      }
    );
  }

  function drawMetaballReflection(group, time) {
    const bounds = buildMetaballMask(group);

    const squashY = 0.58;
    const slices = 16;
    const sliceH = Math.max(2, Math.ceil(bounds.h / slices));
    const flow =
      Math.sin(time * 0.72) * 0.8 +
      Math.sin(time * 0.34 + 1.2) * 0.45;

    ctx.save();
    ctx.globalAlpha = 0.11;

    for (let i = 0; i < slices; i++) {
      const sy = i * sliceH;
      const sh = Math.min(sliceH, bounds.h - sy);
      if (sh <= 0) continue;

      const srcY = bounds.minY + sy;
      const reflectedY = horizonY + (horizonY - (srcY + sh)) * squashY;

      const waveX =
        Math.sin((srcY + sy) * 0.018 + time * 1.14) * 0.9 +
        Math.sin((srcY + sy) * 0.008 + time * 0.62) * 0.32 +
        flow;

      ctx.drawImage(
        state.metaballCanvas,
        0, sy, bounds.w, sh,
        bounds.minX + waveX, reflectedY, bounds.w, sh * squashY
      );
    }

    ctx.restore();
  }

  function drawReflectionShape(pts, time, opt) {
    const {
      bodyAlpha,
      strokeAlpha,
      squashY,
      rippleAmp,
      rippleFreq,
      rippleSpeed
    } = opt;

    const reflected = pts.map((p) => {
      const mirroredY = horizonY + (horizonY - p.y);

      const waveX =
        Math.sin(p.y * rippleFreq + time * rippleSpeed) * rippleAmp +
        Math.sin(p.y * rippleFreq * 0.46 + time * rippleSpeed * 0.62) * rippleAmp * 0.28;

      return {
        x: p.x + waveX,
        y: horizonY + (mirroredY - horizonY) * squashY
      };
    });

    tracePath(reflected);

    const topY = Math.min(...reflected.map((p) => p.y));
    const bottomY = Math.max(...reflected.map((p) => p.y));

    const fillGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
    fillGrad.addColorStop(0, `rgba(255,255,255,${bodyAlpha})`);
    fillGrad.addColorStop(0.45, `rgba(255,255,255,${bodyAlpha * 0.9})`);
    fillGrad.addColorStop(1, `rgba(255,255,255,${bodyAlpha * 0.82})`);

    ctx.fillStyle = fillGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${strokeAlpha})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    drawReflectionSheen(topY, bottomY, time, bodyAlpha);
  }

  function drawReflectionSheen(topY, bottomY, time, alphaBase) {
    const lines = 4;
    const span = Math.max(16, bottomY - topY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    for (let i = 0; i < lines; i++) {
      const yy = topY + span * (0.18 + i / (lines + 2));
      const alpha = alphaBase * (0.10 - i * 0.014);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.2, `rgba(255,255,255,${alpha * 0.42})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(0.8, `rgba(255,255,255,${alpha * 0.42})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 20) {
        const y =
          yy +
          Math.sin(x * 0.011 + time * 1.0 + i * 0.75) * 0.28 +
          Math.sin(x * 0.004 + time * 0.52 + i * 0.28) * 0.14;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /* =========================================================
     Sector 14. Shards / Update
  ========================================================= */
  function getSnapRadius(s) {
    return s.depthBand === "near" ? CONFIG.gatherSnapRadiusNear : CONFIG.gatherSnapRadius;
  }

  function getVanishRadius(s) {
    return s.depthBand === "near" ? CONFIG.vanishRadiusNear : CONFIG.vanishRadius;
  }

  function updateShardBurst(s, dt, t) {
    const k = easeOutExpo((t - T_HINT) / P.burst);
    const noiseX = Math.sin(t * 5.3 + s.edgeSeed) * 4.5 * s.driftNoise;
    const noiseY = Math.cos(t * 4.7 + s.edgeSeed * 0.7) * 4.5 * s.driftNoise;

    s.x += s.dx * dt * (0.88 + 0.38 * k) + noiseX * dt;
    s.y += s.dy * dt * (0.88 + 0.38 * k) + noiseY * dt;
    s.z += s.dz * dt;
    s.rot += s.spin * dt;
  }

  function updateShardDrift(s, dt, t) {
    s.x += s.dx * dt * 0.3 + Math.sin(t * 2.6 + s.edgeSeed) * 5 * dt;
    s.y += s.dy * dt * 0.3 + Math.cos(t * 2.2 + s.edgeSeed * 0.9) * 5 * dt;
    s.z += s.dz * dt * 0.18;
    s.rot += s.spin * dt * 0.38;
  }

  function updateShardGather(s, dt, t) {
    const tk = clamp((t - T_DRIFT) / P.gather, 0, 1);
    const pull = lerp(18, CONFIG.gatherMaxPull, easeInExpo(tk));
    const toX = cx - s.x;
    const toY = cy - s.y;
    const dist = Math.hypot(toX, toY) || 1;
    const nx = toX / dist;
    const ny = toY / dist;

    s.dx = lerp(s.dx, nx * pull, dt * CONFIG.gatherSteer);
    s.dy = lerp(s.dy, ny * pull, dt * CONFIG.gatherSteer);
    s.dz = lerp(s.dz, -s.z * 10.0, dt * CONFIG.gatherZSteer);

    const snapR = getSnapRadius(s);
    if (dist < snapR) {
      const snapT = 1 - dist / snapR;
      const snap = snapT * snapT;
      s.dx = lerp(s.dx, nx * pull * 1.7, snap * 0.32);
      s.dy = lerp(s.dy, ny * pull * 1.7, snap * 0.32);
      s.x = lerp(s.x, cx, snap * 0.18);
      s.y = lerp(s.y, cy, snap * 0.18);
      s.z = lerp(s.z, 0, snap * 0.18);
    }

    s.x += s.dx * dt;
    s.y += s.dy * dt;
    s.z += s.dz * dt;
    s.rot += s.spin * dt * 0.62;

    if (tk > 0.97) {
      s.alpha *= 0.997;
      s.fillAlpha *= 0.994;
    }

    const vanishR = getVanishRadius(s);
    if (dist < vanishR && Math.abs(s.z) < CONFIG.vanishZ) {
      s.dead = true;
      s.alpha = 0;
      s.fillAlpha = 0;
    }
  }

  function updateShards(dt, t) {
    const phase = getPhase(t);

    for (const s of state.shards) {
      if (s.dead) continue;

      if (phase === "hint") {
        s.rot += s.spin * dt * 0.16;
        continue;
      }

      if (phase === "burst") {
        updateShardBurst(s, dt, t);
        continue;
      }

      if (phase === "drift") {
        updateShardDrift(s, dt, t);
        continue;
      }

      if (phase === "gather" || phase === "flash" || phase === "logo" || phase === "done") {
        updateShardGather(s, dt, t);
      }
    }

    for (const s of state.inflow) {
      if (s.dead) continue;
      if (phase !== "gather" && phase !== "flash" && phase !== "logo" && phase !== "done") continue;

      const tk = clamp((t - T_DRIFT) / P.gather, 0, 1);
      const pull = lerp(160, CONFIG.gatherInflowPull, easeInExpo(tk));
      const toX = cx - s.x;
      const toY = cy - s.y;
      const dist = Math.hypot(toX, toY) || 1;
      const nx = toX / dist;
      const ny = toY / dist;

      s.dx = lerp(s.dx, nx * pull, dt * 5.2);
      s.dy = lerp(s.dy, ny * pull, dt * 5.2);

      if (dist < CONFIG.gatherSnapRadius) {
        const snapT = 1 - dist / CONFIG.gatherSnapRadius;
        const snap = snapT * snapT;
        s.x = lerp(s.x, cx, snap * 0.22);
        s.y = lerp(s.y, cy, snap * 0.22);
      }

      s.x += s.dx * dt;
      s.y += s.dy * dt;
      s.rot += s.spin * dt * 0.8;

      if (tk > 0.975) {
        s.alpha *= 0.997;
        s.fillAlpha *= 0.994;
      }

      if (dist < CONFIG.vanishRadius && Math.abs(s.z) < CONFIG.vanishZInflow) {
        s.dead = true;
        s.alpha = 0;
        s.fillAlpha = 0;
      }
    }
  }

  /* =========================================================
     Sector 15. Shards / Draw
  ========================================================= */
  function projectScale(z) {
    return 1 + z / 420;
  }

  function buildShardShape(s) {
    const len = s.len;
    const wid = s.wid;

    if (s.type === "flat") {
      return [
        { x: -len * 0.58, y: -wid * 0.32 },
        { x: -len * 0.18, y: -wid * 0.58 },
        { x: len * 0.54, y: -wid * 0.24 },
        { x: len * 0.36, y: wid * 0.52 },
        { x: -len * 0.46, y: wid * 0.28 }
      ];
    }

    return [
      { x: -len * 0.55, y: -wid * 0.18 },
      { x: len * 0.52, y: -wid * 0.44 },
      { x: len * 0.65, y: 0 },
      { x: len * 0.44, y: wid * 0.34 },
      { x: -len * 0.52, y: wid * 0.18 }
    ];
  }

  function drawSingleShard(s, fadeMul = 1) {
    if (s.dead) return;

    const sc = projectScale(s.z * 0.35);
    const alpha = clamp(s.alpha * fadeMul, 0, 1);
    if (alpha < 0.01) return;

    const padX = w * 0.55 * CONFIG.offscreenBoost;
    const padY = h * 0.55 * CONFIG.offscreenBoost;
    if (s.x < -padX || s.x > w + padX || s.y < -padY || s.y > h + padY) return;

    const shape = buildShardShape(s);

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.scale(sc, sc);

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

  function drawShards(t) {
    const phase = getPhase(t);
    let fadeMul = 1;

    if (phase === "flash") {
      const k = clamp((t - T_GATHER) / P.flash, 0, 1);
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

    for (const s of far) drawSingleShard(s, fadeMul * 0.92);
    for (const s of mid) drawSingleShard(s, fadeMul);
    for (const s of near) drawSingleShard(s, fadeMul * 1.06);

    for (const s of state.inflow) {
      if (!s.dead) drawSingleShard(s, fadeMul * 0.9);
    }
  }

  /* =========================================================
     Sector 16. Compression Flash
  ========================================================= */
  function drawCompressionFlash() {
    if (state.flash <= 0.001) return;

    const k = state.flash;
    const coreR = lerp(2, 20, k);
    const ringR = lerp(4, 84, k);

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR);
    g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
    g.addColorStop(0.15, `rgba(255,255,255,${0.7 * k})`);
    g.addColorStop(0.45, `rgba(255,255,255,${0.18 * k})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.95 * k})`;
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     Sector 17. Brand / Reveal Logo
     - revealLogo を「落下 → 単発バウンド → 固定」に修正
  ========================================================= */
  function setBrandOpacity(opacity) {
    if (!brand) return;
    brand.style.opacity = String(clamp(opacity, 0, 1));
    brand.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
  }

  function getRevealMotion(k) {
    const C = CONFIG.reveal;
    const dropPortion = C.dropDuration / (C.dropDuration + C.bounceDuration);

    let y = 0;
    let scale = C.finalScale;

    if (k <= dropPortion) {
      const t = k / Math.max(dropPortion, 0.0001);
      const e = easeOutCubic(t);

      y = lerp(C.dropFromY, C.dropOvershoot, e);
      scale = lerp(C.startScale, C.impactScale, e);
    } else {
      const t = (k - dropPortion) / Math.max(1 - dropPortion, 0.0001);
      const e = easeInOutCubic(t);

      if (t < 0.5) {
        const t1 = t / 0.5;
        y = lerp(C.dropOvershoot, C.bounceBackY, easeOutCubic(t1));
        scale = lerp(C.impactScale, C.finalScale + 0.008, easeOutCubic(t1));
      } else {
        const t2 = (t - 0.5) / 0.5;
        y = lerp(C.bounceBackY, 0, easeInOutCubic(t2));
        scale = lerp(C.finalScale + 0.008, C.finalScale, easeInOutCubic(t2));
      }
    }

    if (k >= 1) {
      y = 0;
      scale = C.finalScale;
    }

    return { y, scale };
  }

  function setRevealOpacity(opacity) {
    if (!revealLogo) return;

    const k = clamp(opacity, 0, 1);
    revealLogo.style.opacity = String(k);
    revealLogo.style.visibility = k <= 0.001 ? "hidden" : "visible";

    const motion = getRevealMotion(k);
    revealLogo.style.transform =
      `translate(-50%, -50%) translateY(${motion.y}px) scale(${motion.scale})`;
  }

  function prepareLogos() {
    if (brand) {
      brand.style.display = "flex";
      brand.style.opacity = "1";
      brand.style.visibility = "visible";
      brand.style.pointerEvents = "none";
      brand.style.position = brand.style.position || "absolute";
      brand.style.zIndex = "20";
      brand.style.transform = "translate(-50%, -50%)";
    }

    if (revealLogo) {
      revealLogo.style.display = "block";
      revealLogo.style.opacity = "0";
      revealLogo.style.visibility = "hidden";
      revealLogo.style.pointerEvents = "none";
      revealLogo.style.position = revealLogo.style.position || "absolute";
      revealLogo.style.left = revealLogo.style.left || "50%";
      revealLogo.style.top = revealLogo.style.top || "50%";
      revealLogo.style.zIndex = "25";
      revealLogo.style.transform =
        `translate(-50%, -50%) translateY(${CONFIG.reveal.dropFromY}px) scale(${CONFIG.reveal.startScale})`;
    }
  }

  function showRevealLogo() {
    if (!revealLogo) return;
    revealLogo.style.display = "block";
    revealLogo.style.visibility = "visible";
  }

  /* =========================================================
     Sector 18. Gate
  ========================================================= */
  function openEntranceGateFallback() {
    if (!entranceGate) return;

    entranceGate.classList.add("is-visible");
    entranceGate.setAttribute("aria-hidden", "false");

    const rotatePanel = entranceGate.querySelector('[data-gate-panel="rotate"]');
    const languagePanel = entranceGate.querySelector('[data-gate-panel="language"]');
    const isPortraitPhone = coarsePortraitQuery.matches;

    if (rotatePanel) rotatePanel.classList.toggle("is-active", isPortraitPhone);
    if (languagePanel) languagePanel.classList.toggle("is-active", !isPortraitPhone);
  }

  function fireEntranceDone() {
    if (state.entranceDoneFired) return;
    state.entranceDoneFired = true;

    window.dispatchEvent(new Event("entrance:done"));
    window.setTimeout(openEntranceGateFallback, 30);
  }

  /* =========================================================
     Sector 19. Render
  ========================================================= */
  function render(ts) {
    const now = ts * 0.001;
    if (!lastTs) lastTs = now;
    const dt = Math.min(now - lastTs, 0.033);
    lastTs = now;

    const t = clamp(now - startTime, 0, 99);
    const phase = getPhase(t);

    drawBackground(now);

    const hintK = phase === "hint" ? easeOutCubic(t / P.hint) : 0;

    if (!started) {
      updateAuxDroplets(dt, now);
      setBrandOpacity(1);
      setRevealOpacity(0);
      drawReflection(now, 0);
      drawDropletSystem(now, 0);
      rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "hint") {
      setBrandOpacity(1 - hintK * 0.38);
      setRevealOpacity(0);
      drawReflection(now, hintK);
      drawDropletSystem(now, hintK);
      rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "burst" || phase === "drift" || phase === "gather") {
      if (phase === "burst") {
        const burstK = clamp((t - T_HINT) / P.burst, 0, 1);
        setBrandOpacity(1 - easeOutCubic(burstK));

        if (brand) {
          const spread = 1 + burstK * 0.035;
          brand.style.transform = `translate(-50%, -50%) scale(${spread})`;
        }
      } else {
        setBrandOpacity(0);
      }

      setRevealOpacity(0);
      updateShards(dt, t);
      drawShards(t);

      rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "flash") {
      setBrandOpacity(0);
      setRevealOpacity(0);
      updateShards(dt, t);
      drawShards(t);
      state.flash = 1 - clamp((t - T_GATHER) / P.flash, 0, 1);
      drawCompressionFlash();

      rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "logo" || phase === "done") {
      setBrandOpacity(0);
      updateShards(dt, t);
      state.flash = 0;

      if (!state.revealShown) {
        state.revealShown = true;
        showRevealLogo();
      }

      const logoK = clamp((t - T_FLASH) / P.logo, 0, 1);
      setRevealOpacity(logoK);

      if (phase === "done" && !finished) {
        finished = true;
        doneTimer = window.setTimeout(() => {
          fireEntranceDone();
        }, CONFIG.logoHoldAfterReveal * 1000);
      }

      rafId = requestAnimationFrame(render);
      return;
    }
  }

  /* =========================================================
     Sector 20. Start / Trigger
  ========================================================= */
  function startEntrance() {
    if (started) return;

    document.body.classList.add("is-transitioning");

    if (motionQuery.matches) {
      started = true;
      finished = true;
      setBrandOpacity(0);
      showRevealLogo();
      setRevealOpacity(1);
      fireEntranceDone();
      return;
    }

    started = true;
    startTime = performance.now() * 0.001;
    lastTs = 0;
  }

  function handleTrigger(e) {
    if (started) return;

    if (e.type === "keydown") {
      const valid =
        e.key === "Enter" ||
        e.key === " " ||
        e.code === "Space" ||
        e.key === "Spacebar";
      if (!valid) return;
      e.preventDefault();
    }

    startEntrance();
  }

  /* =========================================================
     Sector 21. Boot / Events
  ========================================================= */
  function boot() {
    window.clearTimeout(doneTimer);
    doneTimer = 0;

    started = false;
    finished = false;
    startTime = 0;
    lastTs = 0;

    state.flash = 0;
    state.revealShown = false;
    state.entranceDoneFired = false;
    state.mainAbsorbPulse = 0;

    resize();
    createShardField();
    initAuxDroplets();
    prepareLogos();

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointerdown", handleTrigger, { passive: false });
  window.addEventListener("keydown", handleTrigger);

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", boot);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(boot);
  }

  if (coarsePortraitQuery.addEventListener) {
    coarsePortraitQuery.addEventListener("change", () => {
      if (state.entranceDoneFired) openEntranceGateFallback();
    });
  } else if (coarsePortraitQuery.addListener) {
    coarsePortraitQuery.addListener(() => {
      if (state.entranceDoneFired) openEntranceGateFallback();
    });
  }

  boot();
})();