(() => {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // =========================================
  // DOM参照
  // - 既存HTMLのロゴとUIを使う
  // =========================================
  const langSelect = document.querySelector(".lang-select");
  const idleRomanEl = document.querySelector(".brand");
  const finalLogoEl = document.getElementById("revealLogo");

  // =========================================
  // 基本状態
  // =========================================
  let w = 0;
  let h = 0;
  let dpr = 1;
  let rafId = 0;
  let time = 0;

  let state = "idle"; // idle | shatter | drift | converge | bloom | logo
  let stateStart = 0;
  let nextHref = null;
  let hasTriggered = false;

  // =========================================
  // パーティクル配列
  // - shards: 元の水滴から砕ける破片
  // - inboundShards: 収束時に画面外から追加で流入する破片
  // - bloomParticles: 最終発光の微粒子
  // =========================================
  let shards = [];
  let inboundShards = [];
  let bloomParticles = [];

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ENTER_HREF = "./ja/index.html";

  // =========================================
  // 演出設定
  // - ここを触ると全体テンポや密度を調整しやすい
  // =========================================
  const CONFIG = {
    orbScale: 0.155,
    orbMin: 110,
    orbMax: 250,

    idleOutlineAlpha: 0.044,
    idleCoreAlpha: 0.016,

    // 水滴の揺らぎ
    wave1Amp: 0.034,
    wave2Amp: 0.020,
    wave3Amp: 0.013,
    wave4Amp: 0.008,
    idlePulseAmp: 0.020,

    // 各ステート時間
    shatterDuration: 1000,  // ガラス化して飛散
    driftDuration: 650,     // 宇宙っぽい慣性滞空
    convergeDuration: 500,  // 一気に収束
    bloomDuration: 300,     // 圧縮エネルギー発光
    logoHoldDuration: 820,  // ロゴ表示後遷移まで

    // 破片数
    shardCountLarge: 130,
    shardCountSmall: 340,
    inboundShardCountLarge: 52,
    inboundShardCountSmall: 140,

    // 破片サイズ
    shardLargeMin: 2.0,
    shardLargeMax: 14.0,
    shardSmallMin: 0.7,
    shardSmallMax: 3.2,

    // 飛散レンジ
    explodeRadiusMin: 220,
    explodeRadiusMax: 3400,

    // 3D投影
    camera: 760,
    zNearLimit: -1300,
    zFarLimit: 3200,

    // 収束力
    convergeSnapStrength: 0.090,
    convergeZStrength: 0.080
  };

  // =========================================
  // 汎用関数
  // =========================================
  function nowMs() {
    return performance.now();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function safe(n, fallback = 0) {
    return Number.isFinite(n) ? n : fallback;
  }

  // =========================================
  // 既存HTMLロゴ制御
  // - 初期ローマ字ロゴは .brand
  // - 最終漢字ロゴは #revealLogo
  // =========================================
  function showFinalLogo() {
    if (!finalLogoEl) return;
    finalLogoEl.classList.add("is-visible");
  }

  function hideInitialLogo() {
    if (!document.body.classList.contains("is-transitioning")) {
      document.body.classList.add("is-transitioning");
    }
  }

  // =========================================
  // リサイズ
  // =========================================
  function resize() {
    w = Math.max(1, window.innerWidth || 1);
    h = Math.max(1, window.innerHeight || 1);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // =========================================
  // 座標系
  // =========================================
  function getCenter() {
    return {
      x: safe(w * 0.5, 0),
      y: safe(h * 0.5, 0)
    };
  }

  // =========================================
  // 地平線位置
  // - もっと遠くに見せるため下寄り
  // =========================================
  function getHorizonY() {
    return h * 0.695;
  }

  // =========================================
  // 水滴サイズ
  // =========================================
  function getOrbRadius() {
    if (!w || !h) return 120;
    const base = Math.min(w, h) * CONFIG.orbScale;
    const r = clamp(base, CONFIG.orbMin, CONFIG.orbMax);
    const breathing = 1 + Math.sin(time * 0.18) * CONFIG.idlePulseAmp;
    const result = r * breathing;
    return Number.isFinite(result) ? result : 120;
  }

  // =========================================
  // 水滴輪郭の揺らぎ
  // =========================================
  function radiusAt(theta, baseR, t) {
    const wave1 = Math.sin(theta * 2.0 + t * 0.95) * baseR * CONFIG.wave1Amp;
    const wave2 = Math.sin(theta * 3.2 - t * 0.66 + 0.9) * baseR * CONFIG.wave2Amp;
    const wave3 = Math.sin(theta * 5.6 + t * 0.38 - 1.2) * baseR * CONFIG.wave3Amp;
    const wave4 = Math.sin(theta * 8.8 - t * 0.28 + 2.1) * baseR * CONFIG.wave4Amp;
    const breath = Math.sin(t * 0.18) * baseR * 0.010;
    const rr = baseR + wave1 + wave2 + wave3 + wave4 + breath;
    return Number.isFinite(rr) ? rr : baseR;
  }

  // =========================================
  // 水滴パス生成
  // =========================================
  function buildOrbPath(cx, cy, baseR, t, scale = 1) {
    const steps = 220;
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const r = radiusAt(theta, baseR, t) * scale;
      pts.push({
        x: safe(cx + Math.cos(theta) * r, cx),
        y: safe(cy + Math.sin(theta) * r, cy)
      });
    }

    if (!pts.length) return;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 2; i++) {
      const xc = (pts[i].x + pts[i + 1].x) * 0.5;
      const yc = (pts[i].y + pts[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }

    ctx.quadraticCurveTo(
      pts[pts.length - 2].x,
      pts[pts.length - 2].y,
      pts[0].x,
      pts[0].y
    );

    ctx.closePath();
  }

  // =========================================
  // 背景黒
  // =========================================
  function drawBackground() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }

  // =========================================
  // 地平線 + 水面
  // - 一番奥の細い地平線
  // - 手前は黒い水面
  // =========================================
  function drawHorizonAndWater(cx, cy, r, t, alphaMul = 1) {
    const horizonY = getHorizonY();

    const skyGlow = ctx.createRadialGradient(
      cx,
      horizonY - h * 0.08,
      0,
      cx,
      horizonY - h * 0.08,
      Math.max(w * 0.42, h * 0.22)
    );
    skyGlow.addColorStop(0, `rgba(255,255,255,${0.010 * alphaMul})`);
    skyGlow.addColorStop(0.35, `rgba(255,255,255,${0.004 * alphaMul})`);
    skyGlow.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, w, h);

    const lineGrad = ctx.createLinearGradient(0, horizonY, w, horizonY);
    lineGrad.addColorStop(0, "rgba(255,255,255,0)");
    lineGrad.addColorStop(0.18, `rgba(255,255,255,${0.028 * alphaMul})`);
    lineGrad.addColorStop(0.5, `rgba(255,255,255,${0.085 * alphaMul})`);
    lineGrad.addColorStop(0.82, `rgba(255,255,255,${0.028 * alphaMul})`);
    lineGrad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 0.5);
    ctx.lineTo(w, horizonY + 0.5);
    ctx.stroke();

    const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    waterGrad.addColorStop(0, `rgba(255,255,255,${0.010 * alphaMul})`);
    waterGrad.addColorStop(0.05, `rgba(255,255,255,${0.004 * alphaMul})`);
    waterGrad.addColorStop(0.18, `rgba(255,255,255,${0.002 * alphaMul})`);
    waterGrad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    const mist = ctx.createRadialGradient(
      cx,
      horizonY + (h - horizonY) * 0.06,
      0,
      cx,
      horizonY + (h - horizonY) * 0.06,
      Math.max(w * 0.46, h * 0.18)
    );
    mist.addColorStop(0, `rgba(255,255,255,${0.008 * alphaMul})`);
    mist.addColorStop(0.45, `rgba(255,255,255,${0.0025 * alphaMul})`);
    mist.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = mist;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    for (let i = 0; i < 18; i++) {
      const yy = horizonY + (i / 17) * (h - horizonY);
      const fade = 1 - (i / 17);
      const wobble = Math.sin(t * 0.7 + i * 0.9) * 8;

      const g = ctx.createLinearGradient(0, yy, w, yy);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, `rgba(255,255,255,${0.006 * fade * alphaMul})`);
      g.addColorStop(1, "rgba(255,255,255,0)");

      ctx.strokeStyle = g;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yy + wobble * 0.03);
      ctx.lineTo(w, yy - wobble * 0.03);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================
  // 周辺の空気光
  // =========================================
  function drawAmbientVoid(cx, cy, r, t, alphaMul = 1) {
    const driftX = Math.sin(t * 0.24) * r * 0.04;
    const driftY = Math.cos(t * 0.19) * r * 0.04;

    const g = ctx.createRadialGradient(
      safe(cx + driftX, cx),
      safe(cy + driftY, cy),
      safe(Math.max(0.0001, r * 0.12), 1),
      safe(cx, cx),
      safe(cy, cy),
      safe(Math.max(0.0001, r * 2.7), r * 2.7)
    );

    g.addColorStop(0, `rgba(255,255,255,${0.013 * alphaMul})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.0052 * alphaMul})`);
    g.addColorStop(0.7, `rgba(255,255,255,${0.0018 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, r * 2.7), 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================
  // 逆光
  // - 水滴の後ろからうっすら照らす
  // =========================================
  function drawBackLight(cx, cy, r, t, alphaMul = 1) {
    const backX = cx;
    const backY = cy - r * 0.02;

    const g = ctx.createRadialGradient(
      backX,
      backY,
      r * 0.10,
      backX,
      backY,
      r * 3.3
    );

    g.addColorStop(0, `rgba(255,255,255,${0.085 * alphaMul})`);
    g.addColorStop(0.16, `rgba(255,255,255,${0.032 * alphaMul})`);
    g.addColorStop(0.38, `rgba(255,255,255,${0.010 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(backX, backY, r * 3.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================
  // 水滴の接地影
  // =========================================
  function drawShadow(cx, cy, r, alphaMul = 1) {
    const g = ctx.createRadialGradient(
      safe(cx, cx),
      safe(cy + r * 0.34, cy),
      safe(Math.max(0.0001, r * 0.15), 1),
      safe(cx, cx),
      safe(cy + r * 0.34, cy),
      safe(Math.max(0.0001, r * 1.0), r)
    );

    g.addColorStop(0, `rgba(0,0,0,${0.16 * alphaMul})`);
    g.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.36, r * 0.74, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================
  // 水滴本体
  // =========================================
  function drawOrbBody(cx, cy, r, t, alphaMul = 1, scale = 1) {
    buildOrbPath(cx, cy, r, t, scale);

    const body = ctx.createRadialGradient(
      safe(cx - r * 0.24, cx),
      safe(cy - r * 0.28, cy),
      safe(Math.max(0.0001, r * 0.05), 1),
      safe(cx, cx),
      safe(cy, cy),
      safe(Math.max(0.0001, r * 1.15), r)
    );

    body.addColorStop(0, `rgba(255,255,255,${0.068 * alphaMul})`);
    body.addColorStop(0.28, `rgba(255,255,255,${0.028 * alphaMul})`);
    body.addColorStop(0.56, `rgba(255,255,255,${0.016 * alphaMul})`);
    body.addColorStop(0.8, `rgba(255,255,255,${CONFIG.idleCoreAlpha * alphaMul})`);
    body.addColorStop(1, `rgba(255,255,255,${0.006 * alphaMul})`);

    ctx.fillStyle = body;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${CONFIG.idleOutlineAlpha * alphaMul})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // =========================================
  // 水滴内部テクスチャ
  // =========================================
  function drawInteriorTexture(cx, cy, r, t, alphaMul = 1, scale = 1) {
    ctx.save();
    buildOrbPath(cx, cy, r, t, scale);
    ctx.clip();

    const cols = 54;
    const rows = 54;
    const cellW = (r * 2.16 * scale) / cols;
    const cellH = (r * 2.16 * scale) / rows;

    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const px = cx - r * 1.08 * scale + ix * cellW;
        const py = cy - r * 1.08 * scale + iy * cellH;

        const nx = (px - cx) / (r * scale);
        const ny = (py - cy) / (r * scale);
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (!Number.isFinite(dist) || dist > 1.02) continue;

        const v =
          Math.sin(nx * 6.2 + t * 1.05) +
          Math.sin(ny * 7.0 - t * 0.82) +
          Math.sin((nx + ny) * 4.9 + t * 0.48) +
          Math.sin((nx - ny) * 4.2 - t * 0.34);

        const alpha = ((v + 4) / 8) * 0.012 * alphaMul;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
        ctx.fillRect(px, py, cellW + 0.35, cellH + 0.35);
      }
    }

    ctx.restore();
  }

  // =========================================
  // 水滴ハイライト
  // =========================================
  function drawHighlight(cx, cy, r, t, alphaMul = 1, scale = 1) {
    const hx = cx - r * 0.26 * scale + Math.sin(t * 0.56) * r * 0.020;
    const hy = cy - r * 0.31 * scale + Math.cos(t * 0.40) * r * 0.020;

    const g = ctx.createRadialGradient(
      safe(hx, cx),
      safe(hy, cy),
      safe(Math.max(0.0001, r * 0.01), 1),
      safe(hx, cx),
      safe(hy, cy),
      safe(Math.max(0.0001, r * 0.24 * scale), r * 0.2)
    );

    g.addColorStop(0, `rgba(255,255,255,${0.068 * alphaMul})`);
    g.addColorStop(0.24, `rgba(255,255,255,${0.024 * alphaMul})`);
    g.addColorStop(0.58, `rgba(255,255,255,${0.008 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(1, r * 0.24 * scale), 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================
  // 水面反射
  // - 真下鏡像ではなく水面の揺れに崩した反射
  // =========================================
  function drawOrbReflection(cx, cy, r, t, alphaMul = 1) {
    const horizonY = getHorizonY();
    const reflectedCy = horizonY + (horizonY - cy);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    const fade = ctx.createLinearGradient(0, horizonY, 0, h);
    fade.addColorStop(0, `rgba(255,255,255,${0.18 * alphaMul})`);
    fade.addColorStop(0.12, `rgba(255,255,255,${0.10 * alphaMul})`);
    fade.addColorStop(0.28, `rgba(255,255,255,${0.045 * alphaMul})`);
    fade.addColorStop(0.58, `rgba(255,255,255,${0.012 * alphaMul})`);
    fade.addColorStop(1, "rgba(255,255,255,0)");

    const slices = 36;
    for (let i = 0; i < slices; i++) {
      const y0 = horizonY + ((h - horizonY) / slices) * i;
      const y1 = horizonY + ((h - horizonY) / slices) * (i + 1);
      const localT = i / Math.max(1, slices - 1);

      const rippleX =
        Math.sin(t * 1.2 + i * 0.42) * (1.2 + localT * 6.0) +
        Math.sin(t * 0.54 + i * 0.85) * (0.6 + localT * 2.4);

      const rippleScaleX = 1 + Math.sin(t * 0.7 + i * 0.33) * 0.012;
      const rippleScaleY = 0.82 - localT * 0.28;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, w, Math.max(1, y1 - y0));
      ctx.clip();

      ctx.translate(cx + rippleX, reflectedCy);
      ctx.scale(rippleScaleX, -rippleScaleY);
      ctx.translate(-cx, -cy);

      drawOrbBody(cx, cy, r, t, 0.20 * alphaMul * (1 - localT * 0.72), 1);
      drawInteriorTexture(cx, cy, r, t, 0.09 * alphaMul * (1 - localT * 0.78), 1);
      drawHighlight(cx, cy, r, t, 0.05 * alphaMul * (1 - localT * 0.82), 1);

      ctx.restore();
    }

    const darkFade = ctx.createLinearGradient(0, horizonY, 0, h);
    darkFade.addColorStop(0, "rgba(0,0,0,0)");
    darkFade.addColorStop(0.12, "rgba(0,0,0,0.16)");
    darkFade.addColorStop(0.45, "rgba(0,0,0,0.48)");
    darkFade.addColorStop(1, "rgba(0,0,0,0.82)");

    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = fade;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = darkFade;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.restore();
  }

  // =========================================
  // アイドル時の全体描画
  // =========================================
  function drawIdleOrb(cx, cy, r, t) {
    drawHorizonAndWater(cx, cy, r, t, 1);
    drawAmbientVoid(cx, cy, r, t, 1);
    drawBackLight(cx, cy, r, t, 1);
    drawShadow(cx, cy, r, 0.58);
    drawOrbBody(cx, cy, r, t, 1, 1);
    drawInteriorTexture(cx, cy, r, t, 1, 1);
    drawHighlight(cx, cy, r, t, 1, 1);
    drawOrbReflection(cx, cy, r, t, 1);
  }

  // =========================================
  // ランダム3D方向ベクトル
  // =========================================
  function randomUnitVector3() {
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const k = Math.sqrt(1 - u * u);
    return {
      x: k * Math.cos(theta),
      y: k * Math.sin(theta),
      z: u
    };
  }

  // =========================================
  // 初期破片生成
  // - 水滴から砕ける
  // - 一部は画面外、一部は空間内滞空
  // =========================================
  function createShards(cx, cy, r) {
    shards = [];

    function makeShard(isSmall) {
      const dir = randomUnitVector3();
      const frontness = (dir.z + 1) * 0.5;

      const startRadius = r * (0.72 + Math.random() * 0.32);
      const startX = cx + dir.x * startRadius;
      const startY = cy + dir.y * startRadius;
      const startZ = dir.z * r * 1.0;

      const outerRadius = Math.hypot(w * 0.5, h * 0.5);
      const randomRadius = lerp(r * 1.15, outerRadius * 1.5, Math.random());
      const offscreenChance = 0.42 + (1 - frontness) * 0.18;
      const willExitScreen = Math.random() < offscreenChance;

      let targetRadius;
      let targetZ;

      if (willExitScreen) {
        targetRadius = lerp(outerRadius * 1.02, outerRadius * 1.85, Math.random());
        targetZ = lerp(-260, 900, Math.random());
      } else {
        targetRadius = randomRadius;
        targetZ = frontness > 0.72
          ? lerp(220, 1180, Math.random())
          : lerp(-180, 820, Math.random());
      }

      const targetX = cx + dir.x * targetRadius;
      const targetY = cy + dir.y * targetRadius;

      const sizeMin = isSmall ? CONFIG.shardSmallMin : CONFIG.shardLargeMin;
      const sizeMax = isSmall ? CONFIG.shardSmallMax : CONFIG.shardLargeMax;
      const size = lerp(sizeMin, sizeMax, Math.random()) * lerp(0.85, 1.45, frontness);

      const alpha = isSmall
        ? lerp(0.05, 0.19, frontness)
        : lerp(0.11, 0.31, frontness);

      const aspect = isSmall
        ? 0.8 + Math.random() * 1.8
        : 0.8 + Math.random() * 2.5;

      const spin = (Math.random() - 0.5) * (
        isSmall
          ? lerp(0.14, 0.42, frontness)
          : lerp(0.08, 0.28, frontness)
      );

      const hoverAmp = lerp(0.3, 2.0, Math.random()) * lerp(0.8, 1.5, frontness);
      const driftX = (Math.random() - 0.5) * lerp(8, 32, Math.random());
      const driftY = (Math.random() - 0.5) * lerp(8, 32, Math.random());
      const driftZ = (Math.random() - 0.5) * lerp(10, 90, Math.random());

      shards.push({
        isSmall,
        startX,
        startY,
        startZ,
        x: startX,
        y: startY,
        z: startZ,
        targetX,
        targetY,
        targetZ,
        vx: 0,
        vy: 0,
        vz: 0,
        size,
        baseSize: size,
        alpha,
        aspect,
        rot: Math.random() * Math.PI * 2,
        spin,
        frontness,
        willExitScreen,
        hoverAmp,
        driftX,
        driftY,
        driftZ,
        centerTargetX: cx,
        centerTargetY: cy,
        centerTargetZ: 0,
        hoverDelay: willExitScreen ? 0 : lerp(30, 170, Math.random()),
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0
      });
    }

    for (let i = 0; i < CONFIG.shardCountLarge; i++) makeShard(false);
    for (let i = 0; i < CONFIG.shardCountSmall; i++) makeShard(true);
  }

  // =========================================
  // 外部流入破片生成
  // - 収束時に本来なかった破片が画面外から入る
  // =========================================
  function createInboundShards(cx, cy) {
    inboundShards = [];

    function makeInbound(isSmall) {
      const side = Math.floor(Math.random() * 4);
      let startX = 0;
      let startY = 0;

      const pad = Math.max(w, h) * lerp(0.10, 0.32, Math.random());

      if (side === 0) {
        startX = Math.random() * w;
        startY = -pad;
      } else if (side === 1) {
        startX = w + pad;
        startY = Math.random() * h;
      } else if (side === 2) {
        startX = Math.random() * w;
        startY = h + pad;
      } else {
        startX = -pad;
        startY = Math.random() * h;
      }

      const startZ = lerp(-240, 1400, Math.random());
      const frontness = clamp((startZ + 240) / 1640, 0, 1);

      const sizeMin = isSmall ? CONFIG.shardSmallMin : CONFIG.shardLargeMin;
      const sizeMax = isSmall ? CONFIG.shardSmallMax : CONFIG.shardLargeMax;
      const size = lerp(sizeMin, sizeMax, Math.random()) * lerp(0.8, 1.25, frontness);

      const alpha = isSmall
        ? lerp(0.04, 0.14, frontness)
        : lerp(0.08, 0.22, frontness);

      const aspect = isSmall
        ? 0.8 + Math.random() * 1.8
        : 0.8 + Math.random() * 2.4;

      const spin = (Math.random() - 0.5) * (
        isSmall
          ? lerp(0.12, 0.36, frontness)
          : lerp(0.08, 0.22, frontness)
      );

      const offsetX = (Math.random() - 0.5) * lerp(8, 46, Math.random());
      const offsetY = (Math.random() - 0.5) * lerp(8, 46, Math.random());
      const offsetZ = (Math.random() - 0.5) * lerp(12, 120, Math.random());

      inboundShards.push({
        isSmall,
        startX,
        startY,
        startZ,
        x: startX,
        y: startY,
        z: startZ,
        vx: 0,
        vy: 0,
        vz: 0,
        size,
        baseSize: size,
        alpha,
        aspect,
        rot: Math.random() * Math.PI * 2,
        spin,
        frontness,
        offsetX,
        offsetY,
        offsetZ,
        centerTargetX: cx,
        centerTargetY: cy,
        centerTargetZ: 0
      });
    }

    for (let i = 0; i < CONFIG.inboundShardCountLarge; i++) makeInbound(false);
    for (let i = 0; i < CONFIG.inboundShardCountSmall; i++) makeInbound(true);
  }

  // =========================================
  // 3D投影
  // =========================================
  function project3D(x, y, z) {
    const cam = CONFIG.camera;
    const zz = clamp(z, CONFIG.zNearLimit, CONFIG.zFarLimit);
    const p = cam / (cam + zz);

    return {
      x,
      y,
      scale: clamp(p, 0.16, 5.2),
      visible: cam + zz > 1
    };
  }

  // =========================================
  // ガラス破片描画
  // =========================================
  function drawGlassShard3D(x, y, z, size, aspect, rot, alpha, frontness, isSmall) {
    const proj = project3D(x, y, z);
    if (!proj.visible) return;

    const drawSize = size * proj.scale;
    const drawAlpha = alpha * clamp(proj.scale * 0.95, 0.10, 2.2);

    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(rot);

    if (isSmall) {
      ctx.beginPath();
      ctx.moveTo(-drawSize * 0.95 * aspect, -drawSize * 0.10);
      ctx.lineTo(-drawSize * 0.08, -drawSize * 0.82);
      ctx.lineTo(drawSize * 0.88 * aspect, -drawSize * 0.06);
      ctx.lineTo(drawSize * 0.18, drawSize * 0.75);
      ctx.lineTo(-drawSize * 0.72 * aspect, drawSize * 0.26);
      ctx.closePath();

      ctx.fillStyle = `rgba(255,255,255,${drawAlpha * lerp(0.22, 0.48, frontness)})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.56, 0.92, frontness)})`;
      ctx.lineWidth = clamp(0.28 * proj.scale, 0.20, 0.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-drawSize * 1.2 * aspect, -drawSize * 0.18);
      ctx.lineTo(-drawSize * 0.20, -drawSize * 1.05);
      ctx.lineTo(drawSize * 1.02 * aspect, -drawSize * 0.12);
      ctx.lineTo(drawSize * 0.35, drawSize * 0.98);
      ctx.lineTo(-drawSize * 0.95 * aspect, drawSize * 0.38);
      ctx.closePath();

      ctx.fillStyle = `rgba(255,255,255,${drawAlpha * lerp(0.28, 0.56, frontness)})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.68, 1.0, frontness)})`;
      ctx.lineWidth = clamp(0.42 * proj.scale, 0.28, 1.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-drawSize * 0.52 * aspect, -drawSize * 0.05);
      ctx.lineTo(drawSize * 0.70 * aspect, -drawSize * 0.02);
      ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.30, 0.92, frontness)})`;
      ctx.lineWidth = clamp(0.24 * proj.scale, 0.18, 0.9);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================
  // 飛散イージング
  // =========================================
  function shatterMotion(progress) {
    return 1 - Math.pow(1 - progress, 4.6);
  }

  // =========================================
  // 飛散描画
  // =========================================
  function drawShardsExplode(progress) {
    const move = shatterMotion(progress);
    const drawList = [];

    shards.forEach((s) => {
      s.x = lerp(s.startX, s.targetX, move);
      s.y = lerp(s.startY, s.targetY, move);
      s.z = lerp(s.startZ, s.targetZ, move);
      s.rot += s.spin;
      drawList.push(s);
    });

    drawList.sort((a, b) => a.z - b.z);

    drawList.forEach((s) => {
      const alpha = s.alpha * (1 - progress * 0.10);
      drawGlassShard3D(s.x, s.y, s.z, s.size, s.aspect, s.rot, alpha, s.frontness, s.isSmall);
    });
  }

  // =========================================
  // 慣性滞空
  // - 宇宙っぽい惰性漂流
  // =========================================
  function drawShardsDrift(progress) {
    const drawList = [];
    const driftEase = easeOutCubic(progress);

    shards.forEach((s, idx) => {
      const phase = idx * 0.23 + time * 0.75;

      if (s.willExitScreen) {
        const inertia = 1 + driftEase * 0.42;
        s.x = s.targetX + s.driftX * inertia;
        s.y = s.targetY + s.driftY * inertia;
        s.z = s.targetZ + s.driftZ * inertia;
      } else {
        const inertialX = s.driftX * (0.22 + driftEase * 0.58);
        const inertialY = s.driftY * (0.22 + driftEase * 0.58);
        const inertialZ = s.driftZ * (0.10 + driftEase * 0.30);

        const orbitX = Math.sin(phase * 1.07) * s.hoverAmp * 1.2;
        const orbitY = Math.cos(phase * 0.81 + 0.6) * s.hoverAmp * 1.0;
        const orbitZ = Math.sin(phase * 0.54 + 2.0) * s.hoverAmp * 28;

        s.x = s.targetX + inertialX + orbitX;
        s.y = s.targetY + inertialY + orbitY;
        s.z = s.targetZ + inertialZ + orbitZ;
      }

      s.rot += s.spin * 0.28;
      drawList.push(s);
    });

    drawList.sort((a, b) => a.z - b.z);

    drawList.forEach((s) => {
      const alpha = s.willExitScreen
        ? s.alpha * (1 - progress * 0.20)
        : s.alpha * (1 - progress * 0.03);

      drawGlassShard3D(
        s.x,
        s.y,
        s.z,
        s.size,
        s.aspect,
        s.rot,
        alpha,
        s.frontness,
        s.isSmall
      );
    });
  }

  // =========================================
  // ブルーム微粒子生成
  // =========================================
  function createBloomParticles() {
    const { x: cx, y: cy } = getCenter();
    bloomParticles = [];

    for (let i = 0; i < 100; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * Math.min(w, h) * 0.045;
      bloomParticles.push({
        x: cx + Math.cos(a) * rr,
        y: cy + Math.sin(a) * rr,
        size: 0.8 + Math.random() * 3.2,
        alpha: 0.08 + Math.random() * 0.14
      });
    }
  }

  // =========================================
  // 収束エネルギー光
  // - ぽわぽわではなく一点圧縮発光
  // =========================================
  function drawCentralBloom(progress) {
    const { x: cx, y: cy } = getCenter();

    const compress = Math.pow(clamp(progress, 0, 1), 1.9);
    const flare = Math.sin(compress * Math.PI);
    const base = Math.min(w, h) * lerp(0.020, 0.120, compress);

    const g = ctx.createRadialGradient(
      cx, cy, 0,
      cx, cy, base * (0.6 + flare * 2.6)
    );

    g.addColorStop(0, `rgba(255,255,255,${0.72 * (1 - progress * 0.2)})`);
    g.addColorStop(0.08, `rgba(255,255,255,${0.40 * (1 - progress * 0.28)})`);
    g.addColorStop(0.24, `rgba(255,255,255,${0.14 * (1 - progress * 0.42)})`);
    g.addColorStop(0.52, `rgba(255,255,255,${0.05 * (1 - progress * 0.62)})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, base * (0.6 + flare * 2.6), 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.7);
    core.addColorStop(0, `rgba(255,255,255,${0.92 * (1 - progress * 0.25)})`);
    core.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, base * 0.7), 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================
  // ブルーム微粒子描画
  // =========================================
  function drawBloomParticles(progress) {
    const p = easeOutCubic(progress);
    bloomParticles.forEach((bp) => {
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.size * (1 + p * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${bp.alpha * (1 - progress)})`;
      ctx.fill();
    });
  }

  // =========================================
  // 収束描画
  // - 元の破片 + 外部流入破片を一点へ吸う
  // =========================================
  function drawShardsConverge(progress) {
    const drawList = [];
    const { x: cx, y: cy } = getCenter();

    function updateShard(s, idx, isInbound = false) {
      const elapsedMs = progress * CONFIG.convergeDuration;
      const localProgress = clamp(elapsedMs / Math.max(1, CONFIG.convergeDuration), 0, 1);

      const dist = Math.hypot(s.x - cx, s.y - cy);
      const maxDist = Math.max(Math.hypot(w * 0.5, h * 0.5), 1);
      const outerBias = clamp(dist / maxDist, 0, 1);

      const gravityRise = Math.pow(localProgress, 1.7);
      const pull = easeInCubic(localProgress);

      let snap = 0;
      let snapZ = 0;
      let drag = 0.95;

      if (localProgress < 0.22 && !isInbound) {
        const hoverT = clamp(localProgress / 0.22, 0, 1);
        const phase = idx * 0.37 + hoverT * 4.0 + time * 0.6;

        s.vx *= 0.965;
        s.vy *= 0.965;
        s.vz *= 0.965;

        s.x += Math.sin(phase * 1.13) * (0.10 + s.frontness * 0.26);
        s.y += Math.cos(phase * 0.91) * (0.08 + s.frontness * 0.20);
        s.z += Math.sin(phase * 0.64) * lerp(1.2, 6.0, s.frontness);
      } else {
        const speedBias = lerp(1.40, 0.56, outerBias);

        snap = CONFIG.convergeSnapStrength * speedBias * (0.10 + gravityRise * 4.6);
        snapZ = CONFIG.convergeZStrength * speedBias * (0.08 + gravityRise * 3.9);

        drag = lerp(
          0.958,
          lerp(0.80, 0.87, outerBias),
          gravityRise
        );

        if (localProgress > 0.68) {
          snap *= 1.08;
          snapZ *= 1.08;
        }

        if (localProgress > 0.84) {
          drag *= 0.92;
          snap *= 1.14;
          snapZ *= 1.12;
        }

        s.vx = safe(s.vx, 0) + (s.centerTargetX - s.x + (s.offsetX || 0) * (1 - localProgress) * 0.06) * snap;
        s.vy = safe(s.vy, 0) + (s.centerTargetY - s.y + (s.offsetY || 0) * (1 - localProgress) * 0.06) * snap;
        s.vz = safe(s.vz, 0) + (s.centerTargetZ - s.z + (s.offsetZ || 0) * (1 - localProgress) * 0.04) * snapZ;

        s.vx *= drag;
        s.vy *= drag;
        s.vz *= drag;

        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;
      }

      s.rot += s.spin * (0.10 + (1 - pull) * 0.38);

      drawList.push({
        ...s,
        localProgress,
        isInbound
      });
    }

    shards.forEach((s, idx) => updateShard(s, idx, false));
    inboundShards.forEach((s, idx) => updateShard(s, idx + shards.length, true));

    drawList.sort((a, b) => a.z - b.z);

    drawList.forEach((s) => {
      const alphaFade = 1 - easeOutQuart(s.localProgress);
      const alphaBase = s.isInbound
        ? (s.isSmall ? 0.18 : 0.24)
        : (s.isSmall ? 0.22 : 0.30);

      const alpha = Math.max(0, alphaBase * alphaFade + 0.01 * (1 - s.localProgress));

      const finalSize = lerp(
        s.baseSize * 0.82,
        s.isSmall ? 0.26 : 0.46,
        easeOutCubic(s.localProgress)
      );

      const finalAspect = lerp(s.aspect, 0.96, easeOutCubic(s.localProgress));

      drawGlassShard3D(
        s.x,
        s.y,
        s.z,
        finalSize,
        finalAspect,
        s.rot,
        alpha,
        s.frontness,
        s.isSmall
      );
    });
  }

  // =========================================
  // 遷移開始
  // =========================================
  function startTransition(href) {
    if (state !== "idle") return;

    nextHref = href;
    state = "shatter";
    stateStart = nowMs();

    hideInitialLogo();
    if (langSelect) langSelect.classList.add("is-disabled");

    const { x, y } = getCenter();
    const r = getOrbRadius();

    createShards(x, y, r);
    inboundShards = [];
    if (finalLogoEl) finalLogoEl.classList.remove("is-visible");
  }

  // =========================================
  // ステート遷移管理
  // =========================================
  function maybeAdvanceState(now) {
    const elapsed = now - stateStart;

    if (state === "shatter" && elapsed >= CONFIG.shatterDuration) {
      state = "drift";
      stateStart = now;
      return;
    }

    if (state === "drift" && elapsed >= CONFIG.driftDuration) {
      state = "converge";
      stateStart = now;
      const { x, y } = getCenter();
      createInboundShards(x, y);
      return;
    }

    if (state === "converge" && elapsed >= CONFIG.convergeDuration) {
      state = "bloom";
      stateStart = now;
      createBloomParticles();
      return;
    }

    if (state === "bloom" && elapsed >= CONFIG.bloomDuration) {
      state = "logo";
      stateStart = now;
      showFinalLogo();
      return;
    }

    if (state === "logo" && elapsed >= CONFIG.logoHoldDuration) {
      window.location.href = nextHref;
    }
  }

  // =========================================
  // 全描画
  // =========================================
  function render(now) {
    drawBackground();

    const { x: cx, y: cy } = getCenter();
    const r = getOrbRadius();
    const t = time * 0.48;

    if (state === "idle") {
      drawIdleOrb(cx, cy, r, t);
      return;
    }

    maybeAdvanceState(now);

    if (state === "shatter") {
      const p = clamp((now - stateStart) / CONFIG.shatterDuration, 0, 1);

      const orbAlpha = Math.max(0, 1 - easeOutCubic(p) * 1.08);
      const orbScale = lerp(1, 0.90, p);

      drawHorizonAndWater(cx, cy, r, t, 1 - p * 0.12);
      drawAmbientVoid(cx, cy, r, t, orbAlpha * 0.55);
      drawBackLight(cx, cy, r, t, 1 - p * 0.10);
      drawShadow(cx, cy, r, orbAlpha * 0.48);
      drawOrbBody(cx, cy, r, t, orbAlpha, orbScale);
      drawInteriorTexture(cx, cy, r, t, orbAlpha, orbScale);
      drawHighlight(cx, cy, r, t, orbAlpha, orbScale);
      drawOrbReflection(cx, cy, r, t, orbAlpha * 0.7);

      drawShardsExplode(p);
      return;
    }

    if (state === "drift") {
      const p = clamp((now - stateStart) / CONFIG.driftDuration, 0, 1);
      drawHorizonAndWater(cx, cy, r, t, 1 - p * 0.18);
      drawAmbientVoid(cx, cy, r, t, 0.08 * (1 - p));
      drawBackLight(cx, cy, r, t, 0.82 * (1 - p * 0.2));
      drawShardsDrift(p);
      return;
    }

    if (state === "converge") {
      const p = clamp((now - stateStart) / CONFIG.convergeDuration, 0, 1);
      drawHorizonAndWater(cx, cy, r, t, 0.92 * (1 - p * 0.2));
      drawAmbientVoid(cx, cy, r, t, 0.13 * (1 - p));
      drawBackLight(cx, cy, r, t, 0.72 * (1 - p * 0.35));
      drawShardsConverge(p);

      const preGlow = Math.max(0, (p - 0.48) / 0.52);
      if (preGlow > 0) drawCentralBloom(preGlow);

      return;
    }

    if (state === "bloom") {
      const p = clamp((now - stateStart) / CONFIG.bloomDuration, 0, 1);
      drawHorizonAndWater(cx, cy, r, t, 0.70 * (1 - p * 0.25));
      drawCentralBloom(p);
      drawBloomParticles(p * 0.55);
      drawShardsConverge(0.985 + p * 0.015);
      return;
    }

    if (state === "logo") {
      const p = clamp((now - stateStart) / Math.max(1, CONFIG.logoHoldDuration * 0.42), 0, 1);
      drawHorizonAndWater(cx, cy, r, t, 0.52 * (1 - p * 0.4));
      if (p < 1) {
        drawCentralBloom(0.82 + p * 0.18);
      }
      return;
    }
  }

  // =========================================
  // ループ
  // =========================================
  function tick(now = nowMs()) {
    if (!motionQuery.matches) {
      time += 0.016;
    }

    render(now);
    rafId = requestAnimationFrame(tick);
  }

  // =========================================
  // 再起動
  // =========================================
  function start() {
    cancelAnimationFrame(rafId);
    resize();
    tick();
  }

  // =========================================
  // タップ / クリックで開始
  // =========================================
  function handleScreenTrigger(e) {
    if (state !== "idle" || hasTriggered) return;
    hasTriggered = true;

    if (e && e.preventDefault) e.preventDefault();
    startTransition(ENTER_HREF);
  }

  document.addEventListener("pointerdown", handleScreenTrigger, { passive: false });
  document.addEventListener("touchstart", handleScreenTrigger, { passive: false });
  document.addEventListener("click", handleScreenTrigger, { passive: false });

  window.addEventListener("resize", resize);

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", start);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(start);
  }

  // =========================================
  // 初期化
  // =========================================
  resize();

  if (idleRomanEl) {
    idleRomanEl.style.opacity = "";
    idleRomanEl.style.transform = "";
  }

  if (finalLogoEl) {
    finalLogoEl.classList.remove("is-visible");
  }

  tick();
})();