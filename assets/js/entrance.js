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
      wobbleAmp: 0.105,
      wobbleSpeedA: 0.92,
      wobbleSpeedB: 1.42,
      floatY: -54,

      // 主滴は基本固定。既存描画互換のため保持
      absorbPulseAmp: 0.0,
      absorbPulseDecay: 1.35
    },

    auxDroplets: {
      /* -------------------------------------------------------
         サイズ
      ------------------------------------------------------- */
      sizeRatioLarge: 0.382,
      sizeRatioMedium: 0.236,
      sizeRatioSmall: 0.092,
      maxRadiusRatioToMain: 0.5,

      /* -------------------------------------------------------
         個数
         総数 = 主滴 + 補助滴
      ------------------------------------------------------- */
      minTotalCount: 2,
      maxTotalCount: 4,
      minAuxCount: 1,
      maxAuxCount: 3,

      /* -------------------------------------------------------
         初期構成
         主 + 中 + 小
      ------------------------------------------------------- */
      initialPattern: ["medium", "small"],

      /* -------------------------------------------------------
         分裂時の新滴
         毎回ランダムで 小 / 中 / 大
      ------------------------------------------------------- */
      splitKinds: ["small", "medium", "large"],

      /* -------------------------------------------------------
         新生保護
      ------------------------------------------------------- */
      newbornProtectSec: 4.0,
      newbornProtectMainSec: 8.0,

      /* -------------------------------------------------------
         可動範囲
         brand基準
      ------------------------------------------------------- */
      bounds: {
        sideInset: 18,
        topOffset: 0,
        bottomInsetFromFilm: -14
      },

      /* -------------------------------------------------------
         浮遊
      ------------------------------------------------------- */
      driftForce: 2.12,
      driftDamping: 0.993,
      driftNoiseX: 2.9,
      driftNoiseY: 2.25,
      maxSpeed: 18.0,
      sparsePull: 9.2,

      // 近い時にほんのり軌道を変える程度の重力
      pairGravity: 2.9,
      pairGravityRadius: 170,

      // 同じ場所に0.2秒以上いない
      lingerLimitSec: 0.2,
      lingerRadius: 18,
      lingerPush: 18,

      // 主滴まわりの3帯
      innerBandRatio: 0.26,
      midBandRatio: 0.52,
      outerBandRatio: 0.82,
      ringSwapBias: 0.65,

      // 中央寄りに入ってもよいが長居しない
      centerSoftRadiusRatio: 0.42,
      centerDwellPush: 8,
      centerDriftRadiusRatio: 1.08,
      centerDriftForce: 12,
      centerDriftSoftness: 26,

      /* -------------------------------------------------------
         初期配置 / 適正距離
      ------------------------------------------------------- */
      stableDistLarge: 1.72,
      stableDistMedium: 1.48,
      stableDistSmall: 1.28,
      stableDistJitter: 0.08,

      /* -------------------------------------------------------
         接合
         接合は見た目だけで、力は与えない
      ------------------------------------------------------- */
      contactStartMul: 1.82,
      contactFullMul: 1.06,
      contactMinHold: 0.08,

      // 主滴は同時接合1つまで
      mainContactMax: 1,

      // 2滴接合中に後から来た3滴目は 1/2 で通過
      thirdPassThroughChance: 0.5,

      /* -------------------------------------------------------
         融合
         9割近い深い重なりでのみ融合
      ------------------------------------------------------- */
      mergeOverlapRatio: 0.9,
      mergeDuration: 0.18,
      mergeBounceMin: 6.5,
      mergeBounceMax: 11.5,

      /* -------------------------------------------------------
         分裂
      ------------------------------------------------------- */
      splitDelayMin: 2.0,
      splitDelayMax: 2.0,
      splitStartDistanceRatio: 0.26,
      splitPushForce: 96,
      splitGrowTime: 0.92,
      splitReleaseDistanceRatio: 1.04,

      /* -------------------------------------------------------
         壁反射
      ------------------------------------------------------- */
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
    splitTimer: 0,
    activeMerge: null,
    mainAbsorbPulse: 0,
    lastCountDropAt: -999
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
    return Math.hypot(bx - ax, by - ay);
  }

  function normalize(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, len };
  }

  function rectSize(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return r;
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
      initAuxDroplets(0);
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

  function getTotalDropletCount() {
    return 1 + state.auxDroplets.length;
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

  function inferKindByRadius(r) {
    const mainR = getMainBaseRadius();
    const rr = r / mainR;
    if (rr >= 0.31) return "large";
    if (rr >= 0.16) return "medium";
    return "small";
  }

  function isProtectedFromPair(d, tsSec) {
    return tsSec - d.bornAt < CONFIG.auxDroplets.newbornProtectSec;
  }

  function isProtectedFromMain(d, tsSec) {
    return tsSec - d.bornAt < CONFIG.auxDroplets.newbornProtectMainSec;
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

  function createAuxDroplet(kind, angle, distance, tsSec, bornBySplit = false, targetDistance = null) {
    const bounds = getFloatBounds();
    const x = clamp(cx + Math.cos(angle) * distance, bounds.minX, bounds.maxX);
    const y = clamp(cy + Math.sin(angle) * distance, bounds.minY, bounds.maxY);

    const tangentAngle = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const stable = targetDistance ?? getStableDistanceForKind(kind);

    return {
      kind,
      r: clampAuxRadius(getAuxBaseRadius(kind)),
      x,
      y,
      vx: bornBySplit
        ? Math.cos(angle) * rand(8, 12)
        : Math.cos(tangentAngle) * rand(3.0, 5.4),
      vy: bornBySplit
        ? Math.sin(angle) * rand(8, 12)
        : Math.sin(tangentAngle) * rand(2.2, 4.2),
      alpha: 0.9,
      scale: bornBySplit ? 0.72 : 1,
      life: 0,
      mode: bornBySplit ? "splitting" : "floating", // splitting | floating | contacting | merging
      seed: rand(0, 1000),
      bridge: 0,
      bridgeToMain: 0,
      bornAt: tsSec,
      contactMap: new Map(),
      splitAngle: angle,
      targetSplitDistance: stable,
      lingerX: x,
      lingerY: y,
      lingerT: 0,
      lane: choose(["inner", "mid", "outer"]),
      pushFromMainActive: bornBySplit,
      hasExitedMain: false
    };
  }

  function initAuxDroplets(tsSec) {
    state.auxDroplets.length = 0;
    state.activeMerge = null;
    state.mainAbsorbPulse = 0;
    state.lastCountDropAt = -999;
    state.splitTimer = CONFIG.auxDroplets.splitDelayMin;

    const kinds = CONFIG.auxDroplets.initialPattern;

    for (let i = 0; i < kinds.length; i++) {
      const angle = -Math.PI * 0.34 + i * 0.96 + rand(-0.10, 0.10);
      const dist = getStableDistanceForKind(kinds[i]);
      state.auxDroplets.push(createAuxDroplet(kinds[i], angle, dist, tsSec, false, dist));
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

  function getSparsestDirectionFor(d) {
    const C = CONFIG.auxDroplets;
    const bounds = getFloatBounds();

    const spanX = Math.max(40, (bounds.maxX - bounds.minX) * 0.5);
    const spanY = Math.max(26, (bounds.maxY - bounds.minY) * 0.5);
    const baseR = Math.min(spanX, spanY);

    const innerR = baseR * C.innerBandRatio;
    const midR = baseR * C.midBandRatio;
    const outerR = baseR * C.outerBandRatio;
    const centerSoftR = getMainBaseRadius() * C.centerSoftRadiusRatio;

    const laneRadius =
      d.lane === "inner" ? innerR :
      d.lane === "mid" ? midR :
      outerR;

    if (Math.random() < 0.0032 * C.ringSwapBias) {
      if (d.lane === "inner") d.lane = choose(["inner", "mid"]);
      else if (d.lane === "mid") d.lane = choose(["inner", "mid", "outer"]);
      else d.lane = choose(["mid", "outer"]);
    }

    const toSelf = normalize(d.x - cx, d.y - cy);
    const currentR = toSelf.len || 1;

    const angles = [];
    for (let i = 0; i < 16; i++) angles.push((i / 16) * Math.PI * 2);

    let bestAngle = angles[0];
    let bestScore = Infinity;

    for (const a of angles) {
      const dirX = Math.cos(a);
      const dirY = Math.sin(a);

      const tx = d.x + dirX * 56;
      const ty = d.y + dirY * 40;
      const futureR = dist2(cx, cy, tx, ty);

      let score = 0;

      for (const other of state.auxDroplets) {
        if (other === d) continue;
        const dd = dist2(tx, ty, other.x, other.y);
        score += 1 / Math.max(dd, 28);
      }

      score += Math.abs(futureR - laneRadius) * 0.0028;

      if (futureR < centerSoftR) {
        score += (centerSoftR - futureR) * 0.006;
      }

      if (tx < bounds.minX + 8 || tx > bounds.maxX - 8) score += 0.22;
      if (ty < bounds.minY + 8 || ty > bounds.maxY - 8) score += 0.22;

      if (score < bestScore) {
        bestScore = score;
        bestAngle = a;
      }
    }

    const bestDirX = Math.cos(bestAngle);
    const bestDirY = Math.sin(bestAngle);

    let radialX = 0;
    let radialY = 0;

    if (currentR < laneRadius * 0.8) {
      radialX = toSelf.x;
      radialY = toSelf.y;
    } else if (currentR > laneRadius * 1.18) {
      radialX = -toSelf.x;
      radialY = -toSelf.y;
    }

    let centerDwellX = 0;
    let centerDwellY = 0;
    if (currentR < centerSoftR * 0.82 && d.lingerT > C.lingerLimitSec * 0.75) {
      const k = 1 - currentR / Math.max(centerSoftR * 0.82, 1);
      centerDwellX = toSelf.x * C.centerDwellPush * k;
      centerDwellY = toSelf.y * C.centerDwellPush * k;
    }

    const vx = bestDirX * 0.78 + radialX * 0.62 + centerDwellX * 0.05;
    const vy = bestDirY * 0.78 + radialY * 0.50 + centerDwellY * 0.05;

    const n = normalize(vx, vy);
    return { x: n.x, y: n.y };
  }

  function updateLinger(d, dt) {
    const moved = dist2(d.lingerX, d.lingerY, d.x, d.y);
    if (moved < CONFIG.auxDroplets.lingerRadius) {
      d.lingerT += dt;
    } else {
      d.lingerX = d.x;
      d.lingerY = d.y;
      d.lingerT = 0;
    }

    if (d.lingerT > CONFIG.auxDroplets.lingerLimitSec) {
      const escape = getSparsestDirectionFor(d);
      d.vx += escape.x * CONFIG.auxDroplets.lingerPush * dt * 6.2;
      d.vy += escape.y * CONFIG.auxDroplets.lingerPush * dt * 5.4;

      d.lingerX = d.x;
      d.lingerY = d.y;
      d.lingerT = 0;
    }
  }

  function countStablePairContactsFor(d) {
    let count = 0;
    for (const [key, rec] of d.contactMap.entries()) {
      if (key === "main") continue;
      if (rec.passThrough) continue;
      count++;
    }
    return count;
  }

  function ensureContact(a, b, tsSec, strength, passThrough = false) {
    const idA = state.auxDroplets.indexOf(a);
    const idB = state.auxDroplets.indexOf(b);
    const keyAB = `d${idB}`;
    const keyBA = `d${idA}`;

    const recA = a.contactMap.get(keyAB);
    if (!recA) {
      a.contactMap.set(keyAB, {
        startAt: tsSec,
        lastAt: tsSec,
        strength,
        target: b,
        depth: strength,
        passThrough
      });
    } else {
      recA.lastAt = tsSec;
      recA.strength = Math.max(recA.strength, strength);
      recA.depth = strength;
      recA.target = b;
      recA.passThrough = recA.passThrough || passThrough;
    }

    const recB = b.contactMap.get(keyBA);
    if (!recB) {
      b.contactMap.set(keyBA, {
        startAt: tsSec,
        lastAt: tsSec,
        strength,
        target: a,
        depth: strength,
        passThrough
      });
    } else {
      recB.lastAt = tsSec;
      recB.strength = Math.max(recB.strength, strength);
      recB.depth = strength;
      recB.target = a;
      recB.passThrough = recB.passThrough || passThrough;
    }

    if (a.mode === "floating") a.mode = "contacting";
    if (b.mode === "floating") b.mode = "contacting";
  }

  function ensureMainContact(d, tsSec, strength) {
    const rec = d.contactMap.get("main");
    if (!rec) {
      d.contactMap.set("main", {
        startAt: tsSec,
        lastAt: tsSec,
        strength,
        target: "main",
        depth: strength,
        passThrough: false
      });
    } else {
      rec.lastAt = tsSec;
      rec.strength = Math.max(rec.strength, strength);
      rec.depth = strength;
      rec.target = "main";
    }

    if (d.mode === "floating") d.mode = "contacting";
  }

  function clearStaleContacts(tsSec) {
    for (const d of state.auxDroplets) {
      for (const [key, rec] of d.contactMap.entries()) {
        if (tsSec - rec.lastAt > 0.12) {
          d.contactMap.delete(key);
        }
      }
      if (d.mode === "contacting" && d.contactMap.size === 0) {
        d.mode = "floating";
      }
    }
  }

  function getDeepMergeThreshold(ra, rb) {
    const large = Math.max(ra, rb);
    const small = Math.min(ra, rb);
    const touchDist = large + small;
    const fullContainDist = Math.max(large - small, 0);
    return lerp(touchDist, fullContainDist, CONFIG.auxDroplets.mergeOverlapRatio);
  }

  function canDeepMerge(a, b, d, tsSec) {
    if (isProtectedFromPair(a, tsSec) || isProtectedFromPair(b, tsSec)) return false;
    const ra = a.r * a.scale;
    const rb = b.r * b.scale;
    return d <= getDeepMergeThreshold(ra, rb);
  }

  function beginPairMerge(a, b, tsSec) {
    if (state.activeMerge) return;
    state.activeMerge = {
      a,
      b,
      startAt: tsSec,
      t: 0,
      duration: CONFIG.auxDroplets.mergeDuration
    };
    a.mode = "merging";
    b.mode = "merging";
  }

  function finalizePairMerge(a, b, tsSec) {
    if (!state.auxDroplets.includes(a) || !state.auxDroplets.includes(b)) return;

    const area = Math.PI * (a.r * a.scale) ** 2 + Math.PI * (b.r * b.scale) ** 2;
    const mainR = getMainBaseRadius();
    const maxR = mainR * CONFIG.auxDroplets.maxRadiusRatioToMain;
    const nr = clampAuxRadius(Math.min(Math.sqrt(area / Math.PI), maxR));

    const merged = createAuxDroplet(
      inferKindByRadius(nr),
      rand(0, Math.PI * 2),
      dist2(cx, cy, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5),
      tsSec,
      false
    );

    merged.r = nr;
    merged.x = (a.x + b.x) * 0.5;
    merged.y = (a.y + b.y) * 0.5;

    const baseDir = rand(0, Math.PI * 2);
    const bounce = rand(CONFIG.auxDroplets.mergeBounceMin, CONFIG.auxDroplets.mergeBounceMax);
    merged.vx = Math.cos(baseDir) * bounce + (a.vx + b.vx) * 0.15;
    merged.vy = Math.sin(baseDir) * bounce + (a.vy + b.vy) * 0.15;

    merged.mode = "floating";
    merged.bornAt = tsSec;
    merged.pushFromMainActive = false;
    merged.hasExitedMain = true;

    const ia = state.auxDroplets.indexOf(a);
    const ib = state.auxDroplets.indexOf(b);
    const first = Math.min(ia, ib);
    const second = Math.max(ia, ib);

    state.auxDroplets.splice(second, 1);
    state.auxDroplets.splice(first, 1, merged);

    if (getTotalDropletCount() <= 2) {
      state.lastCountDropAt = tsSec;
      state.splitTimer = CONFIG.auxDroplets.splitDelayMin;
    }
  }

  function updateActiveMerge(dt, tsSec) {
    const m = state.activeMerge;
    if (!m) return;

    const { a, b } = m;
    if (!state.auxDroplets.includes(a) || !state.auxDroplets.includes(b)) {
      state.activeMerge = null;
      return;
    }

    m.t += dt;
    const k = clamp(m.t / m.duration, 0, 1);

    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;

    a.bridge = Math.max(a.bridge, 0.9);
    b.bridge = Math.max(b.bridge, 0.9);

    a.x = lerp(a.x, mx, easeOutCubic(k) * 0.28);
    a.y = lerp(a.y, my, easeOutCubic(k) * 0.28);
    b.x = lerp(b.x, mx, easeOutCubic(k) * 0.28);
    b.y = lerp(b.y, my, easeOutCubic(k) * 0.28);

    if (k >= 1) {
      finalizePairMerge(a, b, tsSec);
      state.activeMerge = null;
    }
  }

  function spawnFromMain(tsSec) {
    if (getTotalDropletCount() >= CONFIG.auxDroplets.maxTotalCount) return;

    const kind = choose(CONFIG.auxDroplets.splitKinds);
    const angle = rand(0, Math.PI * 2);
    const mainR = getMainBaseRadius();
    const startDist = mainR * CONFIG.auxDroplets.splitStartDistanceRatio;
    const targetDist = getStableDistanceForKind(kind);

    state.auxDroplets.push(
      createAuxDroplet(kind, angle, startDist, tsSec, true, targetDist)
    );
  }

  function handleSplitTimer(dt, tsSec) {
    if (getTotalDropletCount() > 2) return;
    if (getTotalDropletCount() >= CONFIG.auxDroplets.maxTotalCount) return;

    state.splitTimer -= dt;
    if (state.splitTimer > 0) return;

    spawnFromMain(tsSec);
    state.splitTimer = CONFIG.auxDroplets.splitDelayMin;
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

  function updateAuxDroplets(dt, tsSec) {
    if (started) return;

    const C = CONFIG.auxDroplets;
    const bounds = getFloatBounds();
    const mainR = getMainBaseRadius();

    updateActiveMerge(dt, tsSec);

    for (const d of state.auxDroplets) {
      d.life += dt;
      d.bridge = lerp(d.bridge, 0, dt * 4.4);
      d.bridgeToMain = lerp(d.bridgeToMain, 0, dt * 4.6);

      if (d.mode === "merging") continue;

      if (d.mode === "splitting") {
        const k = clamp(d.life / C.splitGrowTime, 0, 1);
        d.scale = lerp(0.72, 1, easeOutCubic(k));

        const out = normalize(d.x - cx, d.y - cy);
        d.vx += out.x * C.splitPushForce * dt;
        d.vy += out.y * C.splitPushForce * dt;

        d.x += d.vx * dt;
        d.y += d.vy * dt;

        const distFromMain = dist2(cx, cy, d.x, d.y);

        if (distFromMain >= mainR * C.splitReleaseDistanceRatio) {
          d.hasExitedMain = true;
          d.pushFromMainActive = false;
        }

        if (distFromMain >= d.targetSplitDistance || k >= 1) {
          d.mode = "floating";
          d.life = 0;
          d.vx *= 0.42;
          d.vy *= 0.42;
        }

        applyWallBounce(d, bounds);
        continue;
      }

      if (d.mode === "floating" || d.mode === "contacting") {
        const sparseDir = getSparsestDirectionFor(d);

        const noiseX =
          Math.sin(tsSec * 0.36 + d.seed * 0.63) * C.driftNoiseX +
          Math.sin(tsSec * 0.71 + d.seed * 1.11) * C.driftNoiseX * 0.32;

        const noiseY =
          Math.cos(tsSec * 0.41 + d.seed * 0.47) * C.driftNoiseY +
          Math.sin(tsSec * 0.76 + d.seed * 0.81) * C.driftNoiseY * 0.22;

        let gravX = 0;
        let gravY = 0;
        for (const other of state.auxDroplets) {
          if (other === d) continue;

          const dir = normalize(other.x - d.x, other.y - d.y);
          if (dir.len > C.pairGravityRadius) continue;

          const falloff = 1 - dir.len / C.pairGravityRadius;
          const g = C.pairGravity * falloff * falloff;
          gravX += dir.x * g;
          gravY += dir.y * g * 0.92;
        }

        const fromCenter = normalize(d.x - cx, d.y - cy);
        let centerOutX = 0;
        let centerOutY = 0;
        const centerDriftR = mainR * C.centerDriftRadiusRatio;
        if (fromCenter.len < centerDriftR + C.centerDriftSoftness) {
          const depth = centerDriftR + C.centerDriftSoftness - fromCenter.len;
          const k = clamp(depth / Math.max(C.centerDriftSoftness, 1), 0, 1);
          centerOutX = fromCenter.x * C.centerDriftForce * k;
          centerOutY = fromCenter.y * C.centerDriftForce * k;
        }

        if (d.pushFromMainActive && !d.hasExitedMain) {
          centerOutX += fromCenter.x * C.splitPushForce * 0.38;
          centerOutY += fromCenter.y * C.splitPushForce * 0.38;
          if (fromCenter.len >= mainR * C.splitReleaseDistanceRatio) {
            d.hasExitedMain = true;
            d.pushFromMainActive = false;
          }
        }

        d.vx += (
          noiseX +
          sparseDir.x * C.sparsePull +
          gravX +
          centerOutX
        ) * dt * C.driftForce;

        d.vy += (
          noiseY +
          sparseDir.y * C.sparsePull * 0.62 +
          gravY +
          centerOutY
        ) * dt * C.driftForce;

        updateLinger(d, dt);

        d.vx *= C.driftDamping;
        d.vy *= C.driftDamping;

        limitDropletSpeed(d);

        d.x += d.vx * dt;
        d.y += d.vy * dt;

        applyWallBounce(d, bounds);
      }
    }

    applyPairContacts(tsSec, dt);
    applyMainContacts(tsSec, dt);

    clearStaleContacts(tsSec);
    handleSplitTimer(dt, tsSec);
  }

  function applyPairContacts(tsSec, dt) {
    if (state.activeMerge) return;

    for (let i = 0; i < state.auxDroplets.length; i++) {
      const a = state.auxDroplets[i];
      if (a.mode === "merging" || a.mode === "splitting") continue;

      for (let j = i + 1; j < state.auxDroplets.length; j++) {
        const b = state.auxDroplets[j];
        if (b.mode === "merging" || b.mode === "splitting") continue;

        const dir = normalize(b.x - a.x, b.y - a.y);
        const d = dir.len;
        const rr = a.r * a.scale + b.r * b.scale;

        const start = rr * CONFIG.auxDroplets.contactStartMul;
        const full = rr * CONFIG.auxDroplets.contactFullMul;

        if (d < start) {
          const k = clamp((start - d) / Math.max(start - full, 1), 0, 1);

          let passThrough = false;
          const existingRec = a.contactMap.get(`d${j}`);

          if (!existingRec) {
            const aHasStable = countStablePairContactsFor(a) >= 1;
            const bHasStable = countStablePairContactsFor(b) >= 1;

            if (aHasStable || bHasStable) {
              passThrough = Math.random() < CONFIG.auxDroplets.thirdPassThroughChance;
            }
          } else {
            passThrough = !!existingRec.passThrough;
          }

          ensureContact(a, b, tsSec, k, passThrough);

          a.bridge = Math.max(a.bridge, k);
          b.bridge = Math.max(b.bridge, k);

          if (!passThrough && canDeepMerge(a, b, d, tsSec)) {
            beginPairMerge(a, b, tsSec);
            return;
          }
        }
      }
    }
  }

  function applyMainContacts(tsSec, dt) {
    if (state.activeMerge) return;

    let activeMainContact = null;

    for (const d of state.auxDroplets) {
      const rec = d.contactMap.get("main");
      if (rec && tsSec - rec.lastAt <= 0.12) {
        activeMainContact = d;
        break;
      }
    }

    for (const d of state.auxDroplets) {
      if (d.mode === "merging" || d.mode === "splitting") continue;

      const dist = dist2(cx, cy, d.x, d.y);
      const rr = getMainBaseRadius() + d.r * d.scale;

      const start = rr * CONFIG.auxDroplets.contactStartMul;
      const full = rr * CONFIG.auxDroplets.contactFullMul;

      if (dist < start) {
        const k = clamp((start - dist) / Math.max(start - full, 1), 0, 1);

        if (!activeMainContact || activeMainContact === d) {
          ensureMainContact(d, tsSec, k);
          d.bridgeToMain = Math.max(d.bridgeToMain, k);
          activeMainContact = d;
        }
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
     10. Water Droplet / Draw
  ========================================================= */
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

  function getDropletDeformation(d) {
    let bestPull = 0;
    let pullX = 0;
    let pullY = 0;
    let neckWidth = 0;

    if (d.bridgeToMain > bestPull) {
      bestPull = d.bridgeToMain;
      pullX = cx - d.x;
      pullY = cy - d.y;
      neckWidth = d.bridgeToMain * 0.95;
    }

    for (const other of state.auxDroplets) {
      if (other === d) continue;
      if (other.mode === "splitting") continue;

      const dx = other.x - d.x;
      const dy = other.y - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      const rr = d.r * d.scale + other.r * other.scale;
      const start = rr * CONFIG.auxDroplets.contactStartMul;
      const full = rr * CONFIG.auxDroplets.contactFullMul;

      if (dist < start) {
        const k = clamp((start - dist) / Math.max(start - full, 1), 0, 1);
        if (k > bestPull) {
          bestPull = k;
          pullX = dx;
          pullY = dy;
          neckWidth = k * 0.98;
        }
      }
    }

    if (d.mode === "splitting") {
      const dirX = d.x - cx;
      const dirY = d.y - cy;
      const k = 1 - clamp(dist2(cx, cy, d.x, d.y) / Math.max(d.targetSplitDistance, 1), 0, 1);
      return {
        pullX: -dirX,
        pullY: -dirY,
        pullStrength: k * 0.95,
        squash: k * 0.62,
        neckWidth: k * 1.02
      };
    }

    return {
      pullX,
      pullY,
      pullStrength: bestPull * 0.96,
      squash: bestPull * 0.58,
      neckWidth
    };
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
    ctx.closePath();
  }

  function drawDroplet(time, hintK) {
    let mainPullX = 0;
    let mainPullY = 0;
    let mainPull = 0;

    for (const d of state.auxDroplets) {
      if (d.bridgeToMain > mainPull) {
        mainPull = d.bridgeToMain;
        mainPullX = d.x - cx;
        mainPullY = d.y - cy;
      }
      if (d.mode === "splitting") {
        const k = 1 - clamp(dist2(cx, cy, d.x, d.y) / Math.max(d.targetSplitDistance, 1), 0, 1);
        if (k > mainPull) {
          mainPull = k;
          mainPullX = d.x - cx;
          mainPullY = d.y - cy;
        }
      }
    }

    const pts = buildDropletPathAt(
      cx,
      cy,
      getDropletMorph(time, hintK),
      time,
      0,
      {
        pullX: mainPullX,
        pullY: mainPullY,
        pullStrength: mainPull * 0.92,
        squash: mainPull * 0.52,
        neckWidth: mainPull * 0.96
      }
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

    ctx.strokeStyle = `rgba(255,255,255,${0.17 + hintK * 0.08 + state.mainAbsorbPulse * 0.08})`;
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
      const deformation = getDropletDeformation(d);
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

      ctx.strokeStyle = `rgba(255,255,255,${0.15 * d.alpha})`;
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

    const mainPts = buildDropletPathAt(
      cx,
      cy,
      getDropletMorph(time + 0.08, hintK * 0.72),
      time + 0.08,
      0
    );
    drawReflectionShape(mainPts, time, CONFIG.droplet.radius * 0.7, 0.12, 0.06 + hintK * 0.02);

    for (const d of state.auxDroplets) {
      const m = getAuxMorph(d, time + 0.05);
      const deformation = getDropletDeformation(d);
      const p = buildDropletPathAt(d.x, d.y, m, time + 0.05, d.seed, deformation);
      drawReflectionShape(p, time + d.seed * 0.001, m.r * 0.95, 0.07 * d.alpha, 0.035 * d.alpha);
    }

    ctx.restore();
  }

  function drawReflectionShape(pts, time, extraBottom, fillA, strokeA) {
    const srcTop = Math.min(...pts.map((p) => p.y));
    const srcBottom = Math.max(...pts.map((p) => p.y));
    const halfCut = srcTop + (srcBottom - srcTop) * 0.5;

    const filtered = pts.map((p, i) => {
      const driftX =
        Math.sin(time * 1.7 + i * 0.22) * 1.8 +
        Math.sin(time * 0.9 + i * 0.11) * 0.8;

      const py = Math.max(p.y, halfCut);
      const mirroredY = horizonY + (horizonY - py);

      return {
        x: p.x + driftX,
        y: horizonY + (mirroredY - horizonY) * 0.58
      };
    });

    tracePath(filtered);

    const reflectBottom =
      Math.max(...filtered.map((p) => p.y)) + extraBottom * 0.55;

    const g = ctx.createLinearGradient(0, horizonY, 0, reflectBottom);
    g.addColorStop(0, `rgba(255,255,255,${fillA * 0.92})`);
    g.addColorStop(0.18, `rgba(255,255,255,${fillA * 0.42})`);
    g.addColorStop(0.42, `rgba(255,255,255,${fillA * 0.16})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${strokeA * 0.82})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createLinearGradient(0, horizonY - 2, 0, reflectBottom);
    fade.addColorStop(0, "rgba(255,255,255,0.88)");
    fade.addColorStop(0.16, "rgba(255,255,255,0.56)");
    fade.addColorStop(0.44, "rgba(255,255,255,0.18)");
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
    state.activeMerge = null;
    state.mainAbsorbPulse = 0;
    state.lastCountDropAt = -999;

    resize();
    createShardField();
    initAuxDroplets(0);
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