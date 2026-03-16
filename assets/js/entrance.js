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
     - 水滴系は今回ここを新仕様へ差し替え
     - コメントは「何を変える値か」を日本語で明記
  ========================================================= */
  const CONFIG = {
    /* -------------------------------------------------------
       共通背景
       bg:
       画面全体のベース背景色
    ------------------------------------------------------- */
    bg: "#000000",

    /* -------------------------------------------------------
       水平線の基準帯
       horizonYMin / horizonYMax:
       水平線の高さ帯。中央計算でこの中間を使う
    ------------------------------------------------------- */
    horizonYMin: 0.58,
    horizonYMax: 0.62,

    /* -------------------------------------------------------
       水滴ワールド全体設定
       - 水滴範囲内の背景色
       - 水滴可動範囲
       - ハロー
       - 水面
       - 反射
    ------------------------------------------------------- */
    water: {
      /* -----------------------------------------------------
         水滴範囲内の背景色設定
         areaBgColor:
         水滴が存在する範囲の背景色
         areaBgAlpha:
         その色の見せる強さ
         areaBgSoftAlpha:
         外周へぼかすための弱い層
      ----------------------------------------------------- */
      background: {
        areaBgColor: "#0a0a0a",
        areaBgAlpha: 0.42,
        areaBgSoftAlpha: 0.18
      },

      /* -----------------------------------------------------
         水滴範囲設定
         centerXRatio / centerYRatio:
         水滴世界の中心位置
         mainOffsetY:
         主水滴の見た目上のY補正
         rangeWidthRatio / rangeHeightRatio:
         水滴可動範囲の広さ
         sideInset / topInset / bottomInset:
         可動範囲の内側余白
      ----------------------------------------------------- */
      area: {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        mainOffsetY: -54,

        rangeWidthRatio: 0.34,
        rangeHeightRatio: 0.28,

        sideInset: 18,
        topInset: 0,
        bottomInset: 6
      },

      /* -----------------------------------------------------
         主水滴
         radius:
         主水滴の基本半径
         viewportMinScale / viewportMaxScale:
         画面サイズによる拡縮下限 / 上限
         wobbleAmp:
         主水滴の揺れの強さ
         wobbleSpeedA / wobbleSpeedB:
         主水滴の揺れ速度
         rippleAmpA / rippleAmpB:
         輪郭の細かい脈動量
      ----------------------------------------------------- */
      main: {
        radius: 104,
        viewportMinScale: 0.72,
        viewportMaxScale: 1.12,

        wobbleAmp: 0.108,
        wobbleSpeedA: 0.92,
        wobbleSpeedB: 1.42,
        rippleAmpA: 0.012,
        rippleAmpB: 0.010
      },

      /* -----------------------------------------------------
         従水滴
         kinds:
         従水滴ごとの定義
         - name: 識別名
         - radiusRatio: 主水滴に対する大きさ
         - count: その水滴の個数
         - alpha: 見た目の濃さ
         spawnGapFromMain:
         主水滴輪郭の外側にどれだけ離して生成するか
         maxRadiusRatioToMain:
         従水滴の最大サイズ制限
      ----------------------------------------------------- */
      aux: {
        kinds: [
          { name: "mediumA", radiusRatio: 0.24, count: 1, alpha: 0.92 },
          { name: "smallA",  radiusRatio: 0.12, count: 1, alpha: 0.88 },
          { name: "smallB",  radiusRatio: 0.09, count: 1, alpha: 0.84 }
        ],

        spawnGapFromMain: 14,
        maxRadiusRatioToMain: 0.48,

        /* ---------------------------------------------------
           ノイズ移動
           driftForce:
           ノイズで動く力
           driftDamping:
           動きの減衰
           driftNoiseX / driftNoiseY:
           X/Y方向のノイズ量
           maxSpeed:
           最大速度
           centerBias:
           端に寄り過ぎないための内向き補正
        --------------------------------------------------- */
        motion: {
          driftForce: 2.05,
          driftDamping: 0.9925,
          driftNoiseX: 2.8,
          driftNoiseY: 2.2,
          maxSpeed: 17.5,
          centerBias: 2.4
        },

        /* ---------------------------------------------------
           壁との反応
           wallBounce:
           壁に当たったときの跳ね返り
           wallDamping:
           反射時に他軸へかける減衰
        --------------------------------------------------- */
        wall: {
          wallBounce: 0.92,
          wallDamping: 0.86
        },

        /* ---------------------------------------------------
           従水滴の見た目
           wobbleAmp:
           従水滴の輪郭揺れ量
           wobbleSpeedA / wobbleSpeedB:
           従水滴の揺れ速度
        --------------------------------------------------- */
        visual: {
          wobbleAmp: 0.11,
          wobbleSpeedA: 1.18,
          wobbleSpeedB: 1.84
        }
      },

      /* -----------------------------------------------------
         接近変形
         contactStartMul:
         変形が始まる距離倍率
         contactFullMul:
         もっとも強く変形する距離倍率
      ----------------------------------------------------- */
      contact: {
        contactStartMul: 1.78,
        contactFullMul: 1.08
      },

      /* -----------------------------------------------------
         メタボール接合
         joinMul:
         接合グループ化する距離倍率
         threshold:
         blur後にどこで輪郭確定するか
         blur:
         接合の柔らかさ
         pad:
         マスク余白
      ----------------------------------------------------- */
      metaball: {
        joinMul: 1.62,
        threshold: 132,
        blur: 14,
        pad: 34
      },

      /* -----------------------------------------------------
         ハロー
         radiusRatio:
         ハロー半径
         alphaCore / alphaMid:
         ハローの中心と中間の明るさ
      ----------------------------------------------------- */
      halo: {
        radiusRatio: 0.16,
        alphaCore: 0.12,
        alphaMid: 0.05
      },

      /* -----------------------------------------------------
         水面
         lineCount:
         波線本数
         lineSpacing:
         波線間隔
         amp:
         波線の揺れ
      ----------------------------------------------------- */
      waterSurface: {
        lineCount: 10,
        lineSpacing: 8,
        amp: 0.8
      },

      /* -----------------------------------------------------
         反射
         mainBodyAlpha:
         主水滴反射の濃さ
         auxBodyAlphaMul:
         従水滴反射の濃さ倍率
         strokeAlphaMain / strokeAlphaAux:
         反射線の濃さ
         squashMain / squashAux / squashMetaball:
         反射の縦潰し量
      ----------------------------------------------------- */
      reflection: {
        mainBodyAlpha: 0.10,
        auxBodyAlphaMul: 0.062,
        strokeAlphaMain: 0.045,
        strokeAlphaAux: 0.028,
        squashMain: 0.60,
        squashAux: 0.58,
        squashMetaball: 0.58
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
       - 憂き世の文字は落下
       - 単発でバウンド
       - その後は固定
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
      metaballCanvas: document.createElement("canvas"),
      metaballCtx: null
    }
  };

  state.water.metaballCtx = state.water.metaballCanvas.getContext("2d", {
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
    const viewportScale = Math.min(w / 1200, h / 900, C.viewportMaxScale);
    return C.radius * Math.max(C.viewportMinScale, viewportScale);
  }

  function getWaterBounds() {
    const C = CONFIG.water.area;
    const rect = rectSize(brand);
    const baseWidth = rect ? rect.width : w * C.rangeWidthRatio;
    const width = Math.max(baseWidth, w * C.rangeWidthRatio);
    const height = Math.max(getMainBaseRadius() * 2.7, h * C.rangeHeightRatio);

    return {
      minX: cx - width * 0.5 + C.sideInset,
      maxX: cx + width * 0.5 - C.sideInset,
      minY: cy - height * 0.5 + C.topInset,
      maxY: cy + height * 0.5 - C.bottomInset,
      width,
      height
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
     ---------------------------------------------------------
     ここを全面差し替え
     - 主水滴 / 従水滴
     - 主水滴外での生成
     - 水滴範囲
     - メタボールの下準備
  ========================================================= */
  function createWaterDroplet(kindDef, indexWithinKind) {
    const bounds = getWaterBounds();
    const mainR = getMainBaseRadius();
    const r = clamp(
      mainR * kindDef.radiusRatio,
      mainR * 0.06,
      mainR * CONFIG.water.aux.maxRadiusRatioToMain
    );

    const gap = CONFIG.water.aux.spawnGapFromMain;
    const minDist = mainR + r + gap;
    const maxDist = Math.min(bounds.width, bounds.height) * 0.42;

    let x = cx;
    let y = cy;
    let placed = false;

    for (let i = 0; i < 60; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(minDist, Math.max(minDist + 1, maxDist));
      const tx = cx + Math.cos(ang) * dist;
      const ty = cy + Math.sin(ang) * dist;

      if (
        tx > bounds.minX + r &&
        tx < bounds.maxX - r &&
        ty > bounds.minY + r &&
        ty < bounds.maxY - r &&
        dist2(tx, ty, cx, cy) > minDist
      ) {
        x = tx;
        y = ty;
        placed = true;
        break;
      }
    }

    if (!placed) {
      const ang = rand(0, Math.PI * 2);
      x = clamp(cx + Math.cos(ang) * minDist, bounds.minX + r, bounds.maxX - r);
      y = clamp(cy + Math.sin(ang) * minDist, bounds.minY + r, bounds.maxY - r);
    }

    const tangent = rand(0, Math.PI * 2);

    return {
      name: kindDef.name,
      r,
      alpha: kindDef.alpha,
      x,
      y,
      vx: Math.cos(tangent) * rand(2.2, 4.5),
      vy: Math.sin(tangent) * rand(1.8, 4.0),
      scale: 1,
      life: 0,
      seed: rand(0, 1000),
      indexWithinKind
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
     ---------------------------------------------------------
     ここを全面差し替え
     - 従水滴は主水滴輪郭外で生成済み
     - 可動範囲内をノイズ移動
  ========================================================= */
  function limitDropletSpeed(d) {
    const maxV = CONFIG.water.aux.motion.maxSpeed;
    const len = Math.hypot(d.vx, d.vy);
    if (len > maxV) {
      d.vx = (d.vx / len) * maxV;
      d.vy = (d.vy / len) * maxV;
    }
  }

  function applyWaterBounds(d, bounds) {
    const C = CONFIG.water.aux.wall;
    const r = d.r * d.scale;

    if (d.x < bounds.minX + r) {
      d.x = bounds.minX + r;
      d.vx = Math.abs(d.vx) * C.wallBounce;
      d.vy *= C.wallDamping;
    } else if (d.x > bounds.maxX - r) {
      d.x = bounds.maxX - r;
      d.vx = -Math.abs(d.vx) * C.wallBounce;
      d.vy *= C.wallDamping;
    }

    if (d.y < bounds.minY + r) {
      d.y = bounds.minY + r;
      d.vy = Math.abs(d.vy) * C.wallBounce;
      d.vx *= C.wallDamping;
    } else if (d.y > bounds.maxY - r) {
      d.y = bounds.maxY - r;
      d.vy = -Math.abs(d.vy) * C.wallBounce;
      d.vx *= C.wallDamping;
    }
  }

  function pushOutsideMain(d) {
    const mainR = getMainBaseRadius();
    const minDist = mainR + d.r + CONFIG.water.aux.spawnGapFromMain;
    const dx = d.x - cx;
    const dy = d.y - cy;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      d.x = cx + nx * minDist;
      d.y = cy + ny * minDist;
      d.vx += nx * 1.2;
      d.vy += ny * 1.2;
    }
  }

  function updateWaterDroplets(dt, tsSec) {
    if (started) return;

    const bounds = getWaterBounds();
    const C = CONFIG.water.aux.motion;

    for (const d of state.water.auxDroplets) {
      d.life += dt;

      const noiseX =
        Math.sin(tsSec * 0.36 + d.seed * 0.63) * C.driftNoiseX +
        Math.sin(tsSec * 0.71 + d.seed * 1.11) * C.driftNoiseX * 0.32;

      const noiseY =
        Math.cos(tsSec * 0.41 + d.seed * 0.47) * C.driftNoiseY +
        Math.sin(tsSec * 0.76 + d.seed * 0.81) * C.driftNoiseY * 0.22;

      const toCenterX = cx - d.x;
      const toCenterY = cy - d.y;
      const centerLen = Math.hypot(toCenterX, toCenterY) || 1;

      d.vx += noiseX * dt * C.driftForce + (toCenterX / centerLen) * dt * C.centerBias;
      d.vy += noiseY * dt * C.driftForce + (toCenterY / centerLen) * dt * C.centerBias;

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
     ---------------------------------------------------------
     ここを全面差し替え
     - 単体水滴
     - メタボール接合
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
    ctx.lineWidth = m.r > getMainBaseRadius() * 0.18 ? 0.92 : 0.78;
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
    const off = state.water.metaballCanvas;
    const octx = state.water.metaballCtx;
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
        data[i + 3] = 0;
      }
    }

    octx.putImageData(img, 0, 0);
    return b;
  }

  function drawMetaballGroup(group, hintK) {
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

    ctx.drawImage(state.water.metaballCanvas, bounds.minX, bounds.minY);

    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = body;
    ctx.fillRect(bounds.minX, bounds.minY, bounds.w, bounds.h);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.18 + hintK * 0.05;
    ctx.drawImage(state.water.metaballCanvas, bounds.minX, bounds.minY);

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
     ---------------------------------------------------------
     ここを全面差し替え
     - 水滴範囲内背景色
     - ハロー
     - 水面
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

    ctx.save();

    const g = ctx.createRadialGradient(
      cx,
      cy,
      getMainBaseRadius() * 0.3,
      cx,
      cy,
      Math.max(bounds.width, bounds.height) * 0.7
    );

    const rgb = hexToRgb(C.areaBgColor);
    const c1 = `rgba(${rgb.r},${rgb.g},${rgb.b},${C.areaBgAlpha})`;
    const c2 = `rgba(${rgb.r},${rgb.g},${rgb.b},${C.areaBgSoftAlpha})`;
    const c3 = `rgba(${rgb.r},${rgb.g},${rgb.b},0)`;

    g.addColorStop(0, c1);
    g.addColorStop(0.58, c2);
    g.addColorStop(1, c3);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(bounds.minX - 80, bounds.minY - 80, bounds.width + 160, bounds.height + 160);
    ctx.fill();

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
     Sector 13. Reflection
     ---------------------------------------------------------
     ここを全面差し替え
     - 主滴 / 従滴 / メタボールの反射
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
    const R = CONFIG.water.reflection;

    if (item.type === "main") {
      const pts = buildDropletPathAt(
        cx,
        cy,
        getMainMorph(time, hintK * 0.72),
        time,
        0,
        getVisualDeformationForMain()
      );

      drawReflectionShape(
        pts,
        time,
        {
          bodyAlpha: R.mainBodyAlpha,
          strokeAlpha: R.strokeAlphaMain,
          squashY: R.squashMain,
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
        bodyAlpha: R.auxBodyAlphaMul * d.alpha,
        strokeAlpha: R.strokeAlphaAux * d.alpha,
        squashY: R.squashAux,
        rippleAmp: Math.max(0.35, m.r * 0.018),
        rippleFreq: 0.02,
        rippleSpeed: 1.1
      }
    );
  }

  function drawMetaballReflection(group, time) {
    const bounds = buildMetaballMask(group);
    const squashY = CONFIG.water.reflection.squashMetaball;
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
        state.water.metaballCanvas,
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
     ---------------------------------------------------------
     revealLogo:
     - 落下
     - 単発バウンド
     - その後固定
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
     ---------------------------------------------------------
     - 静止状態 / hint までは新しい水滴系を描画
     - 以後は既存の破片主体
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
     ---------------------------------------------------------
     - 水滴初期化は新しい initWaterDroplets() を使う
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