// assets/js/entrance.js
(() => {
  "use strict";

  /* =========================================================
     01. DOM / Base
  ========================================================= */
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const brand = document.querySelector(".brand");
  const revealLogo = document.getElementById("revealLogo");
  const entranceGate = document.getElementById("entranceGate");

  /* =========================================================
     02. Config / 可変値
  ========================================================= */
  const CONFIG = {
    bg: "#000000",

    horizonYMin: 0.58,
    horizonYMax: 0.62,

    droplet: {
      radius: 104,
      wobbleAmp: 0.115,
      wobbleSpeedA: 1.05,
      wobbleSpeedB: 1.68,
      floatY: -54
    },

    auxDroplets: {
      // 可動範囲を前回より約1.5倍へ
      minDistance: 130,
      maxDistance: 315,

      mediumRadiusMin: 14,
      mediumRadiusMax: 18,
      smallRadiusMin: 6,
      smallRadiusMax: 9,

      // 最初は必ず 主 + 中 + 小
      initialPattern: ["medium", "small"],

      // 分裂後も使う候補
      patterns: [
        ["medium", "small"],
        ["medium", "medium"],
        ["medium", "small", "small"]
      ],

      driftForce: 7.5,
      driftDamping: 0.988,
      driftNoise: 10.5,
      driftYBias: 0.92,

      spawnFromMainSpeed: 220,
      splitGrowTime: 0.62,

      absorbShrinkTime: 0.28,
      mergeFlashMax: 0.18,

      // 表面張力的な合体
      pairAttractRadius: 90,
      pairAttractForce: 18,
      pairMergePadding: 4,

      // 主滴との融合
      mainAttractRadius: 110,
      mainAttractForce: 22,
      mainMergePadding: 5,

      // 分裂の間隔
      splitDelayMin: 0.65,
      splitDelayMax: 1.35,

      // 滴の総数（主滴含め最大4）
      minAuxCount: 2,
      maxAuxCount: 3
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
      dropOvershoot: 22,
      bounceAmp: 16,
      wobbleCycles: 2.1
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
     03. Media Query
  ========================================================= */
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePortraitQuery = window.matchMedia("(pointer: coarse) and (orientation: portrait)");

  /* =========================================================
     04. Runtime State
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
    auxMergePulse: 0,
    splitTimer: 0
  };

  /* =========================================================
     05. Utils
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

  function easeInCubic(t) {
    t = clamp(t, 0, 1);
    return t * t * t;
  }

  function easeInExpo(t) {
    t = clamp(t, 0, 1);
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  }

  function easeOutExpo(t) {
    t = clamp(t, 0, 1);
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function choose(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function dist2(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.hypot(dx, dy);
  }

  function normalize(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, len };
  }

  /* =========================================================
     06. Resize / Layout
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

  /* =========================================================
     07. Shards / Generate
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
     08. Aux Droplets / Model
     - 初期は 主 + 中 + 小
     - 空中生成なし
     - 中央から分裂 / 中央へ融合
     - 滴同士も融合
     - 循環ではなく漂い
  ========================================================= */
  function getMainBaseRadius() {
    return CONFIG.droplet.radius * Math.min(w / 1200, h / 900, 1.12);
  }

  function getRadiusByType(type) {
    const C = CONFIG.auxDroplets;
    if (type === "medium") return rand(C.mediumRadiusMin, C.mediumRadiusMax);
    return rand(C.smallRadiusMin, C.smallRadiusMax);
  }

  function initAuxDroplets() {
    state.auxDroplets.length = 0;
    state.auxMergePulse = 0;
    state.splitTimer = rand(
      CONFIG.auxDroplets.splitDelayMin,
      CONFIG.auxDroplets.splitDelayMax
    );

    // 最初は必ず 主 + 中 + 小
    const initial = CONFIG.auxDroplets.initialPattern;
    for (let i = 0; i < initial.length; i++) {
      state.auxDroplets.push(createSplitDroplet(initial[i], i, initial.length));
    }
  }

  function createSplitDroplet(type, index = 0, total = 2) {
    const C = CONFIG.auxDroplets;
    const mainR = getMainBaseRadius();
    const angleBase = -Math.PI * 0.35 + (index / Math.max(total - 1, 1)) * Math.PI * 0.7 + rand(-0.28, 0.28);
    const startR = mainR * 0.28;
    const targetDist = rand(C.minDistance, C.maxDistance);

    return {
      kind: type,
      r: getRadiusByType(type),
      x: cx + Math.cos(angleBase) * startR,
      y: cy + Math.sin(angleBase) * startR,
      vx: Math.cos(angleBase) * C.spawnFromMainSpeed * rand(0.82, 1.1),
      vy: Math.sin(angleBase) * C.spawnFromMainSpeed * rand(0.82, 1.1) * 0.95,
      targetDist,
      alpha: 0.88,
      scale: 0.45,
      life: 0,
      mode: "splitting", // splitting | drifting | absorbing
      absorbT: 0,
      seed: rand(0, 1000)
    };
  }

  function splitFromMain(countNeeded = 1) {
    const current = state.auxDroplets.length;
    const allowed = CONFIG.auxDroplets.maxAuxCount - current;
    const count = Math.max(0, Math.min(countNeeded, allowed));
    if (!count) return;

    const template = choose(CONFIG.auxDroplets.patterns);
    const candidates = template.slice().sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const type = candidates[i] || choose(["medium", "small"]);
      state.auxDroplets.push(createSplitDroplet(type, i, count));
    }
  }

  function maybeScheduleSplit(dt) {
    const C = CONFIG.auxDroplets;
    if (state.auxDroplets.length >= C.maxAuxCount) return;

    state.splitTimer -= dt;
    if (state.splitTimer > 0) return;

    splitFromMain(1);
    state.splitTimer = rand(C.splitDelayMin, C.splitDelayMax);
  }

  function updateAuxDroplets(dt, time) {
    if (started) return;

    const C = CONFIG.auxDroplets;
    const mainR = getMainBaseRadius();

    state.auxMergePulse = Math.max(0, state.auxMergePulse - dt * 1.15);

    maybeScheduleSplit(dt);

    // 基本更新
    for (const d of state.auxDroplets) {
      d.life += dt;

      if (d.mode === "splitting") {
        const k = clamp(d.life / C.splitGrowTime, 0, 1);
        d.scale = lerp(0.45, 1, easeOutCubic(k));

        d.x += d.vx * dt;
        d.y += d.vy * dt;

        const dc = dist2(cx, cy, d.x, d.y);
        const dir = normalize(d.x - cx, d.y - cy);

        // 目標距離で漂いへ
        if (dc >= d.targetDist || k >= 1) {
          d.mode = "drifting";
          d.vx = dir.x * rand(-18, 18);
          d.vy = dir.y * rand(-18, 18);
          d.life = 0;
        }
        continue;
      }

      if (d.mode === "drifting") {
        const toCenter = normalize(cx - d.x, cy - d.y);
        const distCenter = toCenter.len;

        // 中央の周りを循環ではなく、揺蕩わせる
        const noiseX =
          Math.sin(time * 0.9 + d.seed * 0.7) * C.driftNoise +
          Math.sin(time * 1.55 + d.seed * 1.3) * C.driftNoise * 0.42;

        const noiseY =
          Math.cos(time * 1.0 + d.seed * 0.5) * C.driftNoise * C.driftYBias +
          Math.sin(time * 1.7 + d.seed * 0.8) * C.driftNoise * 0.35;

        // 範囲外に行きすぎたらゆるく戻す
        let boundaryPull = 0;
        if (distCenter > C.maxDistance) {
          boundaryPull = (distCenter - C.maxDistance) * 0.22;
        } else if (distCenter < C.minDistance * 0.72) {
          boundaryPull = -(C.minDistance * 0.72 - distCenter) * 0.18;
        }

        d.vx += (noiseX - toCenter.x * boundaryPull) * dt;
        d.vy += (noiseY - toCenter.y * boundaryPull) * dt;

        d.vx *= C.driftDamping;
        d.vy *= C.driftDamping;

        d.x += d.vx * dt;
        d.y += d.vy * dt;

        d.scale = lerp(d.scale, 1, dt * 5);
      }

      if (d.mode === "absorbing") {
        d.absorbT += dt / C.absorbShrinkTime;
        const k = clamp(d.absorbT, 0, 1);
        d.scale = lerp(1, 0.2, easeInCubic(k));
        d.alpha = lerp(0.88, 0.04, k);

        const dir = normalize(cx - d.x, cy - d.y);
        d.vx = lerp(d.vx, dir.x * 180, dt * 5.5);
        d.vy = lerp(d.vy, dir.y * 180, dt * 5.5);

        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
    }

    // 滴同士の表面張力
    applyDropletPairSurfaceTension(dt);

    // 主滴との表面張力
    applyMainSurfaceTension(dt, mainR);

    // 消去
    state.auxDroplets = state.auxDroplets.filter((d) => {
      if (d.mode !== "absorbing") return true;
      return d.absorbT < 1;
    });
  }

  function applyDropletPairSurfaceTension(dt) {
    const C = CONFIG.auxDroplets;

    for (let i = 0; i < state.auxDroplets.length; i++) {
      const a = state.auxDroplets[i];
      if (a.mode !== "drifting") continue;

      for (let j = i + 1; j < state.auxDroplets.length; j++) {
        const b = state.auxDroplets[j];
        if (b.mode !== "drifting") continue;

        const dir = normalize(b.x - a.x, b.y - a.y);
        const d = dir.len;

        if (d < C.pairAttractRadius) {
          const k = 1 - d / C.pairAttractRadius;
          const force = C.pairAttractForce * k;

          a.vx += dir.x * force * dt;
          a.vy += dir.y * force * dt;
          b.vx -= dir.x * force * dt;
          b.vy -= dir.y * force * dt;
        }

        // 近接で融合
        if (d <= a.r + b.r + C.pairMergePadding) {
          mergeDropletPair(i, j);
          return;
        }
      }
    }
  }

  function mergeDropletPair(i, j) {
    const a = state.auxDroplets[i];
    const b = state.auxDroplets[j];
    if (!a || !b) return;

    const area = Math.PI * a.r * a.r + Math.PI * b.r * b.r;
    const nr = Math.sqrt(area / Math.PI);

    // 2滴が融合して1滴へ
    const merged = {
      kind: nr >= 12 ? "medium" : "small",
      r: clamp(nr, CONFIG.auxDroplets.smallRadiusMin, CONFIG.auxDroplets.mediumRadiusMax),
      x: (a.x + b.x) * 0.5,
      y: (a.y + b.y) * 0.5,
      vx: (a.vx + b.vx) * 0.5,
      vy: (a.vy + b.vy) * 0.5,
      targetDist: (dist2(cx, cy, a.x, a.y) + dist2(cx, cy, b.x, b.y)) * 0.5,
      alpha: 0.9,
      scale: 1.08,
      life: 0,
      mode: "drifting",
      absorbT: 0,
      seed: rand(0, 1000)
    };

    state.auxMergePulse = Math.min(1, state.auxMergePulse + CONFIG.auxDroplets.mergeFlashMax);

    state.auxDroplets.splice(j, 1);
    state.auxDroplets.splice(i, 1, merged);
  }

  function applyMainSurfaceTension(dt, mainR) {
    const C = CONFIG.auxDroplets;

    for (const d of state.auxDroplets) {
      if (d.mode !== "drifting") continue;

      const dir = normalize(cx - d.x, cy - d.y);
      const distCenter = dir.len;

      if (distCenter < C.mainAttractRadius) {
        const k = 1 - distCenter / C.mainAttractRadius;
        const force = C.mainAttractForce * k;

        d.vx += dir.x * force * dt;
        d.vy += dir.y * force * dt;
      }

      if (distCenter <= mainR + d.r + C.mainMergePadding) {
        d.mode = "absorbing";
        d.absorbT = 0;
        state.auxMergePulse = Math.min(1, state.auxMergePulse + C.mergeFlashMax);
      }
    }
  }

  /* =========================================================
     09. Phase
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
     10. Water Droplet
  ========================================================= */
  function getDropletMorph(time, hintK) {
    const base = getMainBaseRadius();
    const mergeBoost = state.auxMergePulse * 0.03;

    const wobble =
      Math.sin(time * CONFIG.droplet.wobbleSpeedA) * 0.55 +
      Math.sin(time * CONFIG.droplet.wobbleSpeedB + 1.4) * 0.45;

    const ripple =
      Math.sin(time * 3.2 + 0.7) * 0.4 +
      Math.sin(time * 4.9 - 0.9) * 0.23;

    const amp = CONFIG.droplet.wobbleAmp * (1 + 0.22 * wobble) + mergeBoost;
    const shiver = hintK * 0.06;

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
      Math.sin(time * 1.35 + d.seed) * 0.55 +
      Math.sin(time * 2.05 + d.seed * 0.6) * 0.45;

    const rr = d.r * d.scale;
    const amp = 0.11 * (1 + local * 0.12);

    return {
      r: rr,
      rx: rr * (1 + amp * 0.24),
      ry: rr * (1.06 - amp * 0.18),
      warpA: amp * 0.75,
      warpB: amp * 0.52
    };
  }

  function buildDropletPathAt(x, y, m, time, seed = 0) {
    const pts = [];
    const n = 56;

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const n1 = Math.sin(a * 3 + time * 1.7 + seed) * m.warpA * 0.12;
      const n2 = Math.sin(a * 5 - time * 2.4 + 0.6 + seed * 0.7) * m.warpB * 0.08;
      const n3 = Math.cos(a * 2 + time * 1.1 - 0.8 + seed * 0.3) * 0.03;
      const rr = 1 + n1 + n2 + n3;

      pts.push({
        x: x + Math.cos(a) * m.rx * rr,
        y: y + Math.sin(a) * m.ry * rr
      });
    }
    return pts;
  }

  function buildDropletPath(time, hintK = 0) {
    const m = getDropletMorph(time, hintK);
    return buildDropletPathAt(cx, cy, m, time, 0);
  }

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
  }

  function drawDroplet(time, hintK) {
    const pts = buildDropletPath(time, hintK);

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

    ctx.strokeStyle = `rgba(255,255,255,${0.17 + hintK * 0.08 + state.auxMergePulse * 0.1})`;
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
      const pts = buildDropletPathAt(d.x, d.y, m, time, d.seed);

      ctx.save();

      const g = ctx.createRadialGradient(
        d.x - m.r * 0.18,
        d.y - m.r * 0.22,
        1,
        d.x,
        d.y,
        m.r * 1.15
      );
      g.addColorStop(0, `rgba(255,255,255,${0.1 * d.alpha})`);
      g.addColorStop(0.45, `rgba(255,255,255,${0.045 * d.alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0.008)");

      tracePath(pts);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${0.15 * d.alpha})`;
      ctx.lineWidth = d.kind === "medium" ? 0.95 : 0.82;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        d.x - m.r * 0.18,
        d.y - m.r * 0.22,
        Math.max(1.5, m.r * 0.18),
        Math.max(2.4, m.r * 0.25),
        -0.34,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(255,255,255,${0.04 * d.alpha})`;
      ctx.fill();

      ctx.restore();
    }
  }

  /* =========================================================
     11. Background / Halo / Horizon / Water
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
     12. Reflection
  ========================================================= */
  function drawReflection(time, hintK) {
    ctx.save();

    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    const pts = buildDropletPath(time + 0.08, hintK * 0.72);
    drawReflectionShape(pts, time, CONFIG.droplet.radius * 0.7, 0.12, 0.06 + hintK * 0.02);

    for (const d of state.auxDroplets) {
      const m = getAuxMorph(d, time + 0.05);
      const p = buildDropletPathAt(d.x, d.y, m, time + 0.05, d.seed);
      drawReflectionShape(p, time + d.seed * 0.001, m.r * 0.95, 0.07 * d.alpha, 0.035 * d.alpha);
    }

    ctx.restore();
  }

  function drawReflectionShape(pts, time, extraBottom, fillA, strokeA) {
    const mirroredPts = pts.map((p, i) => {
      const driftX =
        Math.sin(time * 1.7 + i * 0.22) * 1.8 +
        Math.sin(time * 0.9 + i * 0.11) * 0.8;

      const mirroredY = horizonY + (horizonY - p.y);

      return {
        x: p.x + driftX,
        y: horizonY + (mirroredY - horizonY) * 0.58
      };
    });

    tracePath(mirroredPts);

    const reflectBottom =
      Math.max(...mirroredPts.map((p) => p.y)) + extraBottom;

    const g = ctx.createLinearGradient(0, horizonY, 0, reflectBottom);
    g.addColorStop(0, `rgba(255,255,255,${fillA})`);
    g.addColorStop(0.16, `rgba(255,255,255,${fillA * 0.5})`);
    g.addColorStop(0.38, `rgba(255,255,255,${fillA * 0.22})`);
    g.addColorStop(0.72, `rgba(255,255,255,${fillA * 0.08})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${strokeA})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createLinearGradient(0, horizonY - 2, 0, reflectBottom);
    fade.addColorStop(0, "rgba(255,255,255,0.9)");
    fade.addColorStop(0.15, "rgba(255,255,255,0.65)");
    fade.addColorStop(0.45, "rgba(255,255,255,0.22)");
    fade.addColorStop(0.75, "rgba(255,255,255,0.06)");
    fade.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, horizonY - 2, w, reflectBottom - horizonY + 4);
    ctx.restore();
  }

  /* =========================================================
     13. Shards / Update
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
     14. Shards / Draw
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
     15. Compression Flash
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
     16. Brand / Reveal Logo
  ========================================================= */
  function setBrandOpacity(opacity) {
    if (!brand) return;
    brand.style.opacity = String(clamp(opacity, 0, 1));
    brand.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
  }

  function setRevealOpacity(opacity) {
    if (!revealLogo) return;

    const k = clamp(opacity, 0, 1);

    revealLogo.style.opacity = String(k);
    revealLogo.style.visibility = k <= 0.001 ? "hidden" : "visible";

    let y;
    let scale;

    if (k < 0.62) {
      const drop = k / 0.62;
      y = lerp(-150, 20, easeOutCubic(drop));
      scale = lerp(0.93, 1.03, easeOutCubic(drop));
    } else {
      const settle = (k - 0.62) / 0.38;
      const damp = Math.exp(-3.2 * settle);
      const wave = Math.cos(settle * Math.PI * 3.6);

      y = wave * 18 * damp;
      scale = 1 + Math.cos(settle * Math.PI * 2.2) * 0.012 * damp;
    }

    revealLogo.style.transform =
      `translate(-50%, -50%) translateY(${y}px) scale(${scale})`;
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
        `translate(-50%, -50%) translateY(${CONFIG.reveal.dropFromY}px) scale(0.93)`;
    }
  }

  function showRevealLogo() {
    if (!revealLogo) return;
    revealLogo.style.display = "block";
    revealLogo.style.visibility = "visible";
  }

  /* =========================================================
     17. Gate
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
     18. Render
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
      drawDroplet(now, 0);
      drawAuxDroplets(now);
      rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "hint") {
      setBrandOpacity(1 - hintK * 0.38);
      setRevealOpacity(0);
      drawReflection(now, hintK);
      drawDroplet(now, hintK);
      drawAuxDroplets(now);
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
    }
  }

  /* =========================================================
     19. Start / Trigger
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
     20. Boot / Events
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
// ddd