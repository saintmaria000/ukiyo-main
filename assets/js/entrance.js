// assets/js/entrance.js
(() => {
  "use strict";

  /* =========================================================
     Sector 01. DOM / Base
     ---------------------------------------------------------
     役割:
     - 描画先 canvas と各DOM参照の取得
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
     ---------------------------------------------------------
     役割:
     - 演出全体の調整値
     - 水滴系は「完全固定範囲」「サイズ依存分離」
     - 今回は 3粒構成（主1 + 補助2）
     - 主水滴は画面サイズに応じてレスポンシブ
  ========================================================= */
  const CONFIG = {
    /* -------------------------------------------------------
       共通背景
    ------------------------------------------------------- */
    bg: "#000000",

    /* -------------------------------------------------------
       水平線の基準帯
    ------------------------------------------------------- */
    horizonYMin: 0.58,
    horizonYMax: 0.62,

    /* -------------------------------------------------------
       水滴ワールド全体設定
    ------------------------------------------------------- */
    water: {
      /* -----------------------------------------------------
         水滴範囲内の背景色設定
      ----------------------------------------------------- */
      background: {
        areaBgColor: "#ff1515",
        areaBgAlpha: 0.60,
        areaBgSoftAlpha: 0.7,
        showAreaDebugFill: true,
        showAreaDebugStroke: true,
        areaStrokeColor: "rgba(255,255,255,0.10)"
      },

      /* -----------------------------------------------------
         水滴範囲設定
      ----------------------------------------------------- */
      area: {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        mainOffsetY: -54,

        fixedWidth: 500,
        fixedHeight: 315,

        sideInset: 18,
        topInset: 9,
        bottomInset: -20
      },

      /* -----------------------------------------------------
         主水滴
         - radius: ベース半径
         - viewportMinScale / viewportMaxScale:
           レスポンシブ倍率の上下限
      ----------------------------------------------------- */
      main: {
        radius: 104,

        viewportMinScale: 0.72,
        viewportMaxScale: 1.18,
        responsiveBaseWidth: 1440,
        responsiveBaseHeight: 900,

        wobbleAmp: 0.108,
        wobbleSpeedA: 0.92,
        wobbleSpeedB: 1.42,
        rippleAmpA: 0.012,
        rippleAmpB: 0.010
      },

      /* -----------------------------------------------------
         従水滴
         - 3粒構成:
           主1 + 補助2（mediumA / smallA）
         - 初期配置も役割に沿って固定寄りにしてある
      ----------------------------------------------------- */
      aux: {
        kinds: [
          {
            name: "mediumA",
            radius: 22,
            count: 1,
            alpha: 0.95,
            spawnAngleDeg: 220,
            spawnDistanceMul: 1.02,
            orbitRadiusX: 62,
            orbitRadiusY: 44,
            moveProfile: {
              driftForceMul: 0.84,
              centerBiasMul: 0.72,
              maxSpeedMul: 0.84,
              noiseFreqMul: 0.88,
              wallBounceMul: 0.96,
              wallDampingMul: 1.00,
              gravityMul: 0.34,
              horizonPullMul: 0.18
            }
          },
          {
            name: "smallA",
            radius: 11,
            count: 1,
            alpha: 0.90,
            spawnAngleDeg: 56,
            spawnDistanceMul: 1.58,
            orbitRadiusX: 148,
            orbitRadiusY: 92,
            moveProfile: {
              driftForceMul: 1.08,
              centerBiasMul: 0.20,
              maxSpeedMul: 1.06,
              noiseFreqMul: 1.08,
              wallBounceMul: 1.03,
              wallDampingMul: 0.99,
              gravityMul: 0.72,
              horizonPullMul: 0.54
            }
          }
        ],

        spawnGapFromMain: {
          mediumA: 12,
          smallA: 28
        },

        /* ---------------------------------------------------
           ノイズ移動
           - 水滴らしさを壊さないよう全体は抑えめ
        --------------------------------------------------- */
        motion: {
          driftForce: 1.45,
          driftDamping: 0.991,
          driftNoiseX: 2.0,
          driftNoiseY: 1.6,
          maxSpeed: 13.6,
          centerBias: 1.18
        },

        /* ---------------------------------------------------
           壁との反応
           - 跳ねすぎず、少し勢いを吸われる方向
        --------------------------------------------------- */
        wall: {
          wallBounce: 0.78,
          wallDamping: 0.88
        },

        /* ---------------------------------------------------
           従水滴の見た目
        --------------------------------------------------- */
        visual: {
          wobbleAmp: 0.11,
          wobbleSpeedA: 1.18,
          wobbleSpeedB: 1.84,

          fillAlphaCenter: 0.14,
          fillAlphaMid: 0.065,
          fillAlphaEdge: 0.018,
          strokeAlphaBase: 0.18
        }
      },

      /* -----------------------------------------------------
         接近変形
      ----------------------------------------------------- */
      contact: {
        contactStartMul: 1.78,
        contactFullMul: 1.08
      },

      /* -----------------------------------------------------
         メタボール接合
      ----------------------------------------------------- */
      metaball: {
        joinMul: 1.62,
        threshold: 132,
        blur: 14,
        pad: 34
      },

      /* -----------------------------------------------------
         ハロー
      ----------------------------------------------------- */
      halo: {
        radiusRatio: 0.16,
        alphaCore: 0.12,
        alphaMid: 0.05
      },

      /* -----------------------------------------------------
         水面
      ----------------------------------------------------- */
      waterSurface: {
        lineCount: 10,
        lineSpacing: 8,
        amp: 0.8
      },

      /* -----------------------------------------------------
         反射
      ----------------------------------------------------- */
      reflection: {
        mainBodyAlpha: 0.12,
        auxBodyAlphaMul: 0.08,
        strokeAlphaMain: 0.055,
        strokeAlphaAux: 0.038,
        squashMain: 0.82,
        squashAux: 0.80,
        squashMetaball: 0.80
      }
    },

    /* -------------------------------------------------------
       フェーズ時間
    ------------------------------------------------------- */
    phase: {
      hint: 0.15,
      burst: 1.0,
      drift: 0.5,
      gather: 1.08,
      flash: 0.34,
      logo: 1.28
    },

    logoHoldAfterReveal: 1.42,

    /* -------------------------------------------------------
       revealLogo
    ------------------------------------------------------- */
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

    /* -------------------------------------------------------
       破片演出
    ------------------------------------------------------- */
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

    water: {
      auxDroplets: [],

      /* マスク生成専用 */
      metaballMaskCanvas: document.createElement("canvas"),
      metaballMaskCtx: null,

      /* 合成結果専用 */
      metaballCompositeCanvas: document.createElement("canvas"),
      metaballCompositeCtx: null
    }
  };

  state.water.metaballMaskCtx = state.water.metaballMaskCanvas.getContext("2d", {
    willReadFrequently: true
  });
  state.water.metaballCompositeCtx = state.water.metaballCompositeCanvas.getContext("2d");

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

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full = value.length === 3
      ? value.split("").map((ch) => ch + ch).join("")
      : value;

    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
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

    cx = w * CONFIG.water.area.centerXRatio;
    cy = h * CONFIG.water.area.centerYRatio + CONFIG.water.area.mainOffsetY;
    horizonY = h * lerp(CONFIG.horizonYMin, CONFIG.horizonYMax, 0.5);

    if (!started) {
      createShardField();
      initWaterDroplets();
    }
  }

  function getMainBaseRadius() {
    const C = CONFIG.water.main;

    const scaleW = w / C.responsiveBaseWidth;
    const scaleH = h / C.responsiveBaseHeight;
    const responsiveScale = (scaleW * 0.58) + (scaleH * 0.42);
    const finalScale = clamp(
      responsiveScale,
      C.viewportMinScale,
      C.viewportMaxScale
    );

    return C.radius * finalScale;
  }

  function getWaterBounds() {
    const C = CONFIG.water.area;
    const baseMinX = cx - C.fixedWidth * 0.5;
    const baseMaxX = cx + C.fixedWidth * 0.5;
    const baseMinY = cy - C.fixedHeight * 0.5;
    const baseMaxY = cy + C.fixedHeight * 0.5;

    const minX = baseMinX + C.sideInset;
    const maxX = baseMaxX - C.sideInset;
    const minY = baseMinY + C.topInset;
    const maxY = baseMaxY - C.bottomInset;

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY
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
  ========================================================= */
  function createWaterDroplet(kindDef, indexWithinKind) {
    const bounds = getWaterBounds();
    const mainR = getMainBaseRadius();
    const r = kindDef.radius;

    const gapMap = CONFIG.water.aux.spawnGapFromMain;
    const gap =
      typeof gapMap === "number"
        ? gapMap
        : (gapMap[kindDef.name] ?? 16);

    const minDist = mainR + r + gap;

    const angleDeg = kindDef.spawnAngleDeg ?? rand(0, 360);
    const angle = angleDeg * Math.PI / 180;
    const distMul = kindDef.spawnDistanceMul ?? 1;
    const initialDist = minDist * distMul;

    let x = cx + Math.cos(angle) * initialDist;
    let y = cy + Math.sin(angle) * initialDist;

    x = clamp(x, bounds.minX + r, bounds.maxX - r);
    y = clamp(y, bounds.minY + r, bounds.maxY - r);

    const tangent = angle + (Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2);

    return {
      name: kindDef.name,
      r,
      alpha: kindDef.alpha,
      x,
      y,
      vx: Math.cos(tangent) * rand(0.8, 2.0),
      vy: Math.sin(tangent) * rand(0.6, 1.8),
      scale: 1,
      life: 0,
      seed: rand(0, 1000),
      indexWithinKind,

      moveProfile: kindDef.moveProfile || {
        driftForceMul: 1,
        centerBiasMul: 1,
        maxSpeedMul: 1,
        noiseFreqMul: 1,
        wallBounceMul: 1,
        wallDampingMul: 1,
        gravityMul: 1,
        horizonPullMul: 0
      },

      anchorX: x,
      anchorY: y,
      orbitRadiusX: kindDef.orbitRadiusX ?? 96,
      orbitRadiusY: kindDef.orbitRadiusY ?? 64,
      orbitPhase: rand(0, Math.PI * 2)
    };
  }

  function initWaterDroplets() {
    state.water.auxDroplets.length = 0;

    for (const kindDef of CONFIG.water.aux.kinds) {
      for (let i = 0; i < kindDef.count; i++) {
        state.water.auxDroplets.push(createWaterDroplet(kindDef, i));
      }
    }
  }

  function getMainMorph(time, hintK) {
    const C = CONFIG.water.main;
    const base = getMainBaseRadius();

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

  function getAuxMorph(d, time) {
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

  function getPairContactK(ax, ay, ar, bx, by, br) {
    const d = dist2(ax, ay, bx, by);
    const rr = ar + br;

    const start = rr * CONFIG.water.contact.contactStartMul;
    const full = rr * CONFIG.water.contact.contactFullMul;

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

    for (const other of state.water.auxDroplets) {
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

    for (const d of state.water.auxDroplets) {
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
  function limitDropletSpeed(d) {
    const baseMaxV = CONFIG.water.aux.motion.maxSpeed;
    const maxV = baseMaxV * (d.moveProfile?.maxSpeedMul || 1);

    const len = Math.hypot(d.vx, d.vy);
    if (len > maxV) {
      d.vx = (d.vx / len) * maxV;
      d.vy = (d.vy / len) * maxV;
    }
  }

  function applyWaterBounds(d, bounds) {
    const base = CONFIG.water.aux.wall;
    const mp = d.moveProfile || {};

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

  function pushOutsideMain(d) {
    const mainR = getMainBaseRadius();
    const gapMap = CONFIG.water.aux.spawnGapFromMain;
    const gap =
      typeof gapMap === "number"
        ? gapMap
        : (gapMap[d.name] ?? 16);

    const minDist = mainR + d.r + gap;
    const dx = d.x - cx;
    const dy = d.y - cy;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      d.x = cx + nx * minDist;
      d.y = cy + ny * minDist;
      d.vx += nx * 0.65;
      d.vy += ny * 0.65;
    }
  }

  function updateWaterDroplets(dt, tsSec) {
    if (started) return;

    const bounds = getWaterBounds();
    const C = CONFIG.water.aux.motion;

    for (const d of state.water.auxDroplets) {
      d.life += dt;

      const mp = d.moveProfile || {
        driftForceMul: 1,
        centerBiasMul: 1,
        maxSpeedMul: 1,
        noiseFreqMul: 1,
        wallBounceMul: 1,
        wallDampingMul: 1,
        gravityMul: 1,
        horizonPullMul: 0
      };

      const nf = mp.noiseFreqMul || 1;

      const orbitX =
        d.anchorX +
        Math.cos(tsSec * (0.22 * nf) + d.orbitPhase) * d.orbitRadiusX;

      const orbitY =
        d.anchorY +
        Math.sin(tsSec * (0.18 * nf) + d.orbitPhase * 0.9) * d.orbitRadiusY;

      const noiseX =
        Math.sin(tsSec * (0.34 * nf) + d.seed * 0.63) * C.driftNoiseX +
        Math.sin(tsSec * (0.61 * nf) + d.seed * 1.11) * C.driftNoiseX * 0.24;

      const noiseY =
        Math.cos(tsSec * (0.37 * nf) + d.seed * 0.47) * C.driftNoiseY +
        Math.sin(tsSec * (0.69 * nf) + d.seed * 0.81) * C.driftNoiseY * 0.18;

      const toOrbitX = orbitX - d.x;
      const toOrbitY = orbitY - d.y;
      const orbitLen = Math.hypot(toOrbitX, toOrbitY) || 1;

      const horizonPull =
        d.y < horizonY - 18
          ? 0
          : (d.y - (horizonY - 18)) * 0.0022 * (mp.horizonPullMul || 0);

      const gravity = 0.075 * (mp.gravityMul || 1);

      d.vx +=
        noiseX * dt * C.driftForce * (mp.driftForceMul || 1) +
        (toOrbitX / orbitLen) * dt * C.centerBias * (mp.centerBiasMul || 1);

      d.vy +=
        noiseY * dt * C.driftForce * (mp.driftForceMul || 1) +
        (toOrbitY / orbitLen) * dt * C.centerBias * (mp.centerBiasMul || 1) +
        gravity +
        horizonPull;

      d.vx *= C.driftDamping;
      d.vy *= C.driftDamping;

      limitDropletSpeed(d);

      d.x += d.vx * dt;
      d.y += d.vy * dt;

      pushOutsideMain(d);
      applyWaterBounds(d, bounds);
    }
  }

  /* =========================================================
     Sector 11. Water System / Draw
  ========================================================= */
  function tracePath(pts) {
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

  function drawMainDroplet(time, hintK) {
    const deformation = getVisualDeformationForMain();
    const pts = buildDropletPathAt(
      cx,
      cy,
      getMainMorph(time, hintK),
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

  function drawSingleAuxDroplet(d, time) {
    const m = getAuxMorph(d, time);
    const deformation = getVisualDeformationForAux(d);
    const pts = buildDropletPathAt(d.x, d.y, m, time, d.seed, deformation);
    const V = CONFIG.water.aux.visual;

    ctx.save();

    const g = ctx.createRadialGradient(
      d.x - m.r * 0.18,
      d.y - m.r * 0.22,
      1,
      d.x,
      d.y,
      m.r * 1.18
    );
    g.addColorStop(0, `rgba(255,255,255,${V.fillAlphaCenter * d.alpha})`);
    g.addColorStop(0.42, `rgba(255,255,255,${V.fillAlphaMid * d.alpha})`);
    g.addColorStop(1, `rgba(255,255,255,${V.fillAlphaEdge * d.alpha})`);

    tracePath(pts);
    ctx.fillStyle = g;
    ctx.fill();

    const contactBoost = deformation ? deformation.pullStrength : 0;
    ctx.strokeStyle = `rgba(255,255,255,${(V.strokeAlphaBase + contactBoost * 0.08) * d.alpha})`;
    ctx.lineWidth = m.r > 18 ? 0.92 : 0.78;
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
    ctx.fillStyle = `rgba(255,255,255,${0.05 * d.alpha})`;
    ctx.fill();

    ctx.restore();
  }

  function getMainRenderDroplet(time, hintK) {
    const m = getMainMorph(time, hintK);
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
    return state.water.auxDroplets.map((d, i) => {
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
    return d <= rr * CONFIG.water.metaball.joinMul;
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

  function buildMetaballMask(group) {
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
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }

    octx.putImageData(img, 0, 0);
    return b;
  }

  function buildMetaballComposite(group, hintK) {
    const bounds = buildMetaballMask(group);

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
    body.addColorStop(0, "rgba(255,255,255,0.12)");
    body.addColorStop(0.38, "rgba(255,255,255,0.055)");
    body.addColorStop(0.72, "rgba(255,255,255,0.028)");
    body.addColorStop(1, "rgba(255,255,255,0.01)");

    cctx.fillStyle = body;
    cctx.fillRect(0, 0, bounds.w, bounds.h);

    cctx.globalCompositeOperation = "destination-in";
    cctx.drawImage(maskCanvas, 0, 0);

    cctx.globalCompositeOperation = "source-over";
    cctx.globalAlpha = 0.18 + hintK * 0.05;
    cctx.drawImage(maskCanvas, 0, 0);
    cctx.globalAlpha = 1;

    cctx.globalCompositeOperation = "lighter";
    for (const d of group) {
      cctx.beginPath();
      cctx.ellipse(
        (d.x - bounds.minX) - d.rx * 0.18,
        (d.y - bounds.minY) - d.ry * 0.22,
        Math.max(1.5, d.rx * 0.18),
        Math.max(2.2, d.ry * 0.24),
        -0.35,
        0,
        Math.PI * 2
      );
      cctx.fillStyle = "rgba(255,255,255,0.055)";
      cctx.fill();
    }

    cctx.globalCompositeOperation = "source-over";
    return bounds;
  }

  function drawMetaballGroup(group, hintK) {
    const bounds = buildMetaballComposite(group, hintK);

    ctx.save();
    ctx.drawImage(
      state.water.metaballCompositeCanvas,
      bounds.minX,
      bounds.minY
    );
    ctx.restore();
  }

  function drawWaterDropletSystem(time, hintK) {
    const items = [getMainRenderDroplet(time, hintK), ...getAuxRenderDroplets(time)];
    const groups = buildDropletGroups(items);

    for (const group of groups) {
      if (group.length === 1) {
        const item = group[0];
        if (item.type === "main") drawMainDroplet(time, hintK);
        else drawSingleAuxDroplet(item.source, time);
      } else {
        drawMetaballGroup(group, hintK);
      }
    }
  }

  /* =========================================================
     Sector 12. Background / Halo / Water
  ========================================================= */
  function drawBackground(time) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CONFIG.bg;
    ctx.fillRect(0, 0, w, h);

    drawWaterAreaBackground();
    drawHalo(time);
    drawHorizon(time);
    drawWater(time);
  }

  function drawWaterAreaBackground() {
    const bounds = getWaterBounds();
    const C = CONFIG.water.background;
    const rgb = hexToRgb(C.areaBgColor);

    ctx.save();

    if (C.showAreaDebugFill) {
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${C.areaBgAlpha})`;
      ctx.fillRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
    }

    const g = ctx.createRadialGradient(
      cx,
      cy,
      Math.min(bounds.width, bounds.height) * 0.18,
      cx,
      cy,
      Math.max(bounds.width, bounds.height) * 0.72
    );
    g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${C.areaBgSoftAlpha})`);
    g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(
      bounds.minX - 80,
      bounds.minY - 80,
      (bounds.maxX - bounds.minX) + 160,
      (bounds.maxY - bounds.minY) + 160
    );
    ctx.fill();

    if (C.showAreaDebugStroke) {
      ctx.strokeStyle = C.areaStrokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
    }

    ctx.restore();
  }

  function drawHalo(time) {
    const H = CONFIG.water.halo;
    const pulse = 0.93 + Math.sin(time * 1.1) * 0.03;
    const r = Math.max(w, h) * H.radiusRatio * pulse;

    const g = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, r);
    g.addColorStop(0, `rgba(255,255,255,${H.alphaCore})`);
    g.addColorStop(0.33, `rgba(255,255,255,${H.alphaMid})`);
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
    const W = CONFIG.water.waterSurface;

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

    for (let i = 0; i < W.lineCount; i++) {
      const y = horizonY + 6 + i * W.lineSpacing;
      const a = 0.018 * (1 - i / W.lineCount);
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
        const yy = y + Math.sin(x * 0.012 + wave) * W.amp;
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

    const items = [getMainRenderDroplet(time, hintK), ...getAuxRenderDroplets(time)];
    const groups = buildDropletGroups(items);

    for (const group of groups) {
      if (group.length === 1) {
        drawSingleMirrorReflection(group[0], time, hintK);
      } else {
        drawMetaballMirrorReflection(group, hintK);
      }
    }

    ctx.restore();
  }

  function drawSingleMirrorReflection(item, time, hintK) {
    let pts;
    let alpha;
    let lineAlpha;
    let squashY;

    if (item.type === "main") {
      pts = buildDropletPathAt(
        cx,
        cy,
        getMainMorph(time, hintK),
        time,
        0,
        getVisualDeformationForMain()
      );
      alpha = CONFIG.water.reflection.mainBodyAlpha;
      lineAlpha = CONFIG.water.reflection.strokeAlphaMain;
      squashY = CONFIG.water.reflection.squashMain;
    } else {
      const d = item.source;
      const m = getAuxMorph(d, time);

      pts = buildDropletPathAt(
        d.x,
        d.y,
        m,
        time,
        d.seed,
        getVisualDeformationForAux(d)
      );
      alpha = CONFIG.water.reflection.auxBodyAlphaMul * d.alpha;
      lineAlpha = CONFIG.water.reflection.strokeAlphaAux * d.alpha;
      squashY = CONFIG.water.reflection.squashAux;
    }

    const reflected = pts.map((p) => {
      const mirroredY = horizonY + (horizonY - p.y);
      return {
        x: p.x,
        y: horizonY + (mirroredY - horizonY) * squashY
      };
    });

    ctx.save();

    tracePath(reflected);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.restore();
  }

  function drawMetaballMirrorReflection(group, hintK) {
    const bounds = buildMetaballComposite(group, hintK);
    const srcCanvas = state.water.metaballCompositeCanvas;
    const squashY = CONFIG.water.reflection.squashMetaball;

    const srcBottom = bounds.maxY;
    const reflectedTop = horizonY + (horizonY - srcBottom) * squashY;
    const reflectedHeight = bounds.h * squashY;

    ctx.save();
    ctx.globalAlpha = 0.11;

    ctx.drawImage(
      srcCanvas,
      0, 0, bounds.w, bounds.h,
      bounds.minX, reflectedTop, bounds.w, reflectedHeight
    );

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
      updateWaterDroplets(dt, now);
      setBrandOpacity(1);
      setRevealOpacity(0);
      drawReflection(now, 0);
      drawWaterDropletSystem(now, 0);
      rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "hint") {
      setBrandOpacity(1 - hintK * 0.38);
      setRevealOpacity(0);
      drawReflection(now, hintK);
      drawWaterDropletSystem(now, hintK);
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

    started = true;
    finished = false;
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

    if (e.cancelable) e.preventDefault();
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

    resize();
    createShardField();
    initWaterDroplets();
    prepareLogos();

    if (motionQuery.matches) {
      setBrandOpacity(1);
      setRevealOpacity(0);
    }

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