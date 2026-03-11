(() => {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const langLinks = document.querySelectorAll(".lang-link");
  const langSelect = document.querySelector(".lang-select");

  let w = 0;
  let h = 0;
  let dpr = 1;
  let rafId = 0;
  let time = 0;

  let state = "idle"; // idle | shatter | converge | bloom | logo
  let stateStart = 0;
  let nextHref = null;

  let shards = [];
  let bloomParticles = [];
  let finalLogoEl = null;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CONFIG = {
    orbScale: 0.155,
    orbMin: 110,
    orbMax: 250,

    idleOutlineAlpha: 0.042,
    idleCoreAlpha: 0.014,

    // 水滴の揺らめきを少し強める
    wave1Amp: 0.034,
    wave2Amp: 0.020,
    wave3Amp: 0.013,
    wave4Amp: 0.008,
    idlePulseAmp: 0.020,

    shatterDuration: 2100,
    convergeDuration: 1650,
    bloomDuration: 820,
    logoHoldDuration: 1200,

    shardCountLarge: 95,
    shardCountSmall: 220,

    shardLargeMin: 2.0,
    shardLargeMax: 14.0,
    shardSmallMin: 0.7,
    shardSmallMax: 3.0,

    explodeRadiusMin: 1200,
    explodeRadiusMax: 3200,

    camera: 760,
    zNearLimit: -1100,
    zFarLimit: 2600,

    convergeSnapStrength: 0.060,
    convergeZStrength: 0.050
  };

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

  function ensureFinalLogo() {
    if (finalLogoEl) return finalLogoEl;

    const style = document.createElement("style");
    style.textContent = `
      .js-final-logo{
        position:fixed;
        inset:0;
        z-index:12;
        display:grid;
        place-items:center;
        text-align:center;
        pointer-events:none;
        opacity:0;
      }

      .js-final-logo__inner{
        transform:translateY(-42px) scale(.988);
        opacity:0;
      }

      .js-final-logo.is-visible{
        opacity:1;
      }

      .js-final-logo.is-visible .js-final-logo__inner{
        animation:jsFinalLogoDrop 1180ms cubic-bezier(.19,.82,.22,1) forwards;
      }

      .js-final-logo__main{
        color:rgba(255,255,255,.95);
        font-size:clamp(2.8rem, 10vw, 7rem);
        line-height:1;
        letter-spacing:.16em;
        white-space:nowrap;
      }

      .js-final-logo__sub{
        margin-top:14px;
        color:rgba(255,255,255,.36);
        font-size:clamp(.72rem, 1.35vw, 1rem);
        letter-spacing:.30em;
        text-transform:uppercase;
      }

      @keyframes jsFinalLogoDrop{
        0%{
          opacity:0;
          transform:translateY(-42px) scale(.988);
        }
        58%{
          opacity:1;
          transform:translateY(5px) scale(1);
        }
        78%{
          opacity:1;
          transform:translateY(-1px) scale(1);
        }
        100%{
          opacity:1;
          transform:translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);

    finalLogoEl = document.createElement("div");
    finalLogoEl.className = "js-final-logo";
    finalLogoEl.setAttribute("aria-hidden", "true");
    finalLogoEl.innerHTML = `
      <div class="js-final-logo__inner">
        <div class="js-final-logo__main">憂き世</div>
        <div class="js-final-logo__sub">ukiyo Film</div>
      </div>
    `;
    document.body.appendChild(finalLogoEl);
    return finalLogoEl;
  }

  function showFinalLogo() {
    const el = ensureFinalLogo();
    el.classList.add("is-visible");
  }

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

  function getCenter() {
    return {
      x: safe(w * 0.5, 0),
      y: safe(h * 0.5, 0)
    };
  }

  function getOrbRadius() {
    if (!w || !h) return 120;
    const base = Math.min(w, h) * CONFIG.orbScale;
    const r = clamp(base, CONFIG.orbMin, CONFIG.orbMax);
    const breathing = 1 + Math.sin(time * 0.18) * CONFIG.idlePulseAmp;
    const result = r * breathing;
    return Number.isFinite(result) ? result : 120;
  }

  function radiusAt(theta, baseR, t) {
    const wave1 = Math.sin(theta * 2.0 + t * 0.95) * baseR * CONFIG.wave1Amp;
    const wave2 = Math.sin(theta * 3.2 - t * 0.66 + 0.9) * baseR * CONFIG.wave2Amp;
    const wave3 = Math.sin(theta * 5.6 + t * 0.38 - 1.2) * baseR * CONFIG.wave3Amp;
    const wave4 = Math.sin(theta * 8.8 - t * 0.28 + 2.1) * baseR * CONFIG.wave4Amp;
    const breath = Math.sin(t * 0.18) * baseR * 0.010;
    const rr = baseR + wave1 + wave2 + wave3 + wave4 + breath;
    return Number.isFinite(rr) ? rr : baseR;
  }

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

  function drawBackground() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }

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

    g.addColorStop(0, `rgba(255,255,255,${0.012 * alphaMul})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.0048 * alphaMul})`);
    g.addColorStop(0.7, `rgba(255,255,255,${0.0017 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, r * 2.7), 0, Math.PI * 2);
    ctx.fill();
  }

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

    body.addColorStop(0, `rgba(255,255,255,${0.062 * alphaMul})`);
    body.addColorStop(0.28, `rgba(255,255,255,${0.026 * alphaMul})`);
    body.addColorStop(0.56, `rgba(255,255,255,${0.015 * alphaMul})`);
    body.addColorStop(0.8, `rgba(255,255,255,${CONFIG.idleCoreAlpha * alphaMul})`);
    body.addColorStop(1, `rgba(255,255,255,${0.0055 * alphaMul})`);

    ctx.fillStyle = body;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${CONFIG.idleOutlineAlpha * alphaMul})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

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

    g.addColorStop(0, `rgba(255,255,255,${0.062 * alphaMul})`);
    g.addColorStop(0.24, `rgba(255,255,255,${0.023 * alphaMul})`);
    g.addColorStop(0.58, `rgba(255,255,255,${0.008 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(1, r * 0.24 * scale), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIdleOrb(cx, cy, r, t) {
    drawAmbientVoid(cx, cy, r, t, 1);
    drawShadow(cx, cy, r, 1);
    drawOrbBody(cx, cy, r, t, 1, 1);
    drawInteriorTexture(cx, cy, r, t, 1, 1);
    drawHighlight(cx, cy, r, t, 1, 1);
  }

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

  function createShards(cx, cy, r) {
    shards = [];

    function makeShard(isSmall) {
      const dir = randomUnitVector3();

      const startRadius = r * (0.72 + Math.random() * 0.32);
      const startX = cx + dir.x * startRadius;
      const startY = cy + dir.y * startRadius;
      const startZ = dir.z * r * 1.0;

      const explodeLength = lerp(CONFIG.explodeRadiusMin, CONFIG.explodeRadiusMax, Math.random());
      const spreadBoost = isSmall ? lerp(1.0, 1.55, Math.random()) : lerp(0.9, 1.2, Math.random());

      const targetX = cx + dir.x * explodeLength * spreadBoost;
      const targetY = cy + dir.y * explodeLength * spreadBoost;
      const targetZ = dir.z * explodeLength * spreadBoost;

      const frontness = (dir.z + 1) * 0.5;
      const sizeMin = isSmall ? CONFIG.shardSmallMin : CONFIG.shardLargeMin;
      const sizeMax = isSmall ? CONFIG.shardSmallMax : CONFIG.shardLargeMax;
      const size = lerp(sizeMin, sizeMax, Math.random()) * lerp(0.85, 1.4, frontness);

      const alpha = isSmall
        ? lerp(0.05, 0.18, frontness)
        : lerp(0.10, 0.30, frontness);

      const aspect = isSmall
        ? 0.8 + Math.random() * 1.8
        : 0.8 + Math.random() * 2.5;

      const spin = (Math.random() - 0.5) * (
        isSmall
          ? lerp(0.14, 0.42, frontness)
          : lerp(0.08, 0.28, frontness)
      );

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
        centerTargetX: cx,
        centerTargetY: cy,
        centerTargetZ: 0,
        distFromCenterNorm: 1,
        frontness,

        // 手前ほど少し滞空
        hoverDelay: lerp(0, 260, frontness) + Math.random() * 180
      });
    }

    for (let i = 0; i < CONFIG.shardCountLarge; i++) makeShard(false);
    for (let i = 0; i < CONFIG.shardCountSmall; i++) makeShard(true);
  }

  function project3D(x, y, z) {
    const cam = CONFIG.camera;
    const zz = clamp(z, CONFIG.zNearLimit, CONFIG.zFarLimit);
    const p = cam / (cam + zz);

    return {
      x,
      y,
      scale: clamp(p, 0.16, 5.0),
      visible: cam + zz > 1
    };
  }

  function drawGlassShard3D(x, y, z, size, aspect, rot, alpha, frontness, isSmall) {
    const proj = project3D(x, y, z);
    if (!proj.visible) return;

    const drawSize = size * proj.scale;
    const drawAlpha = alpha * clamp(proj.scale * 0.95, 0.10, 2.0);

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

      ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.56, 0.90, frontness)})`;
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

      ctx.fillStyle = `rgba(255,255,255,${drawAlpha * lerp(0.28, 0.55, frontness)})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.68, 1.0, frontness)})`;
      ctx.lineWidth = clamp(0.42 * proj.scale, 0.28, 1.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-drawSize * 0.52 * aspect, -drawSize * 0.05);
      ctx.lineTo(drawSize * 0.70 * aspect, -drawSize * 0.02);
      ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.30, 0.90, frontness)})`;
      ctx.lineWidth = clamp(0.24 * proj.scale, 0.18, 0.9);
      ctx.stroke();
    }

    ctx.restore();
  }

  function shatterMotion(progress) {
    return 1 - Math.pow(1 - progress, 4.8);
  }

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
      const alpha = s.alpha * (1 - progress * 0.14);
      drawGlassShard3D(s.x, s.y, s.z, s.size, s.aspect, s.rot, alpha, s.frontness, s.isSmall);
    });
  }

  function createBloomParticles() {
    const { x: cx, y: cy } = getCenter();
    bloomParticles = [];

    for (let i = 0; i < 100; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.min(w, h) * 0.045;
      bloomParticles.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        size: 0.8 + Math.random() * 3.2,
        alpha: 0.08 + Math.random() * 0.14
      });
    }
  }

  function drawCentralBloom(progress) {
    const { x: cx, y: cy } = getCenter();
    const base = Math.min(w, h) * 0.09;
    const p = easeOutBack(clamp(progress, 0, 1));

    const g = ctx.createRadialGradient(
      cx, cy, 0,
      cx, cy, base * (0.55 + p * 1.95)
    );

    g.addColorStop(0, `rgba(255,255,255,${0.32 * (1 - progress)})`);
    g.addColorStop(0.18, `rgba(255,255,255,${0.17 * (1 - progress)})`);
    g.addColorStop(0.55, `rgba(255,255,255,${0.05 * (1 - progress)})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, base * (0.55 + p * 1.95), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBloomParticles(progress) {
    const p = easeOutCubic(progress);
    bloomParticles.forEach((bp) => {
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.size * (1 + p * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${bp.alpha * (1 - progress)})`;
      ctx.fill();
    });
  }

  function drawShardsConverge(progress) {
    const drawList = [];
    const { x: cx, y: cy } = getCenter();

    shards.forEach((s) => {
      const elapsedMs = progress * CONFIG.convergeDuration;
      const holdRatio = clamp(s.hoverDelay / CONFIG.convergeDuration, 0, 0.45);
      const localProgress = clamp((elapsedMs - s.hoverDelay) / Math.max(1, CONFIG.convergeDuration - s.hoverDelay), 0, 1);

      const dist = Math.hypot(s.x - cx, s.y - cy);
      const maxDist = Math.max(Math.hypot(w * 0.5, h * 0.5), 1);
      s.distFromCenterNorm = clamp(dist / maxDist, 0, 1);

      const outerBias = s.distFromCenterNorm;
      const innerBias = 1 - outerBias;

      const pull = easeInCubic(localProgress);
      const shapedPull = easeInOutCubic(localProgress);

      let snap = 0;
      let snapZ = 0;
      let drag = 0.94;

      if (elapsedMs < s.hoverDelay) {
        const hoverT = clamp(elapsedMs / Math.max(1, s.hoverDelay), 0, 1);
        const hoverWave = Math.sin(hoverT * Math.PI) * 0.20;

        s.vx *= 0.965;
        s.vy *= 0.965;
        s.vz *= 0.965;

        s.x += Math.sin(s.rot * 1.13 + hoverT * 3.4) * (0.14 + s.frontness * 0.24);
        s.y += Math.cos(s.rot * 0.92 + hoverT * 2.8) * (0.10 + s.frontness * 0.20);
        s.z += hoverWave * lerp(1.8, 10.0, s.frontness);
      } else {
        const speedBias = lerp(1.28, 0.56, outerBias); // 内側速く / 外側遅く
        snap = CONFIG.convergeSnapStrength * speedBias * (0.22 + shapedPull * 3.1);
        snapZ = CONFIG.convergeZStrength * speedBias * (0.18 + shapedPull * 2.7);

        // 終盤は強く drag をかけて跳ね返りを殺す
        drag = lerp(
          0.93,
          lerp(0.84, 0.89, outerBias),
          shapedPull
        );

        if (localProgress > 0.78) {
          drag *= 0.92;
          snap *= 1.12;
          snapZ *= 1.08;
        }

        if (localProgress > 0.90) {
          drag *= 0.88;
          snap *= 1.18;
          snapZ *= 1.14;
        }

        s.vx += (s.centerTargetX - s.x) * snap;
        s.vy += (s.centerTargetY - s.y) * snap;
        s.vz += (s.centerTargetZ - s.z) * snapZ;

        s.vx *= drag;
        s.vy *= drag;
        s.vz *= drag;

        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;
      }

      s.rot += s.spin * (0.10 + (1 - pull) * 0.48);

      drawList.push({
        ...s,
        localProgress,
        holdRatio,
        innerBias
      });
    });

    drawList.sort((a, b) => a.z - b.z);

    drawList.forEach((s) => {
      const alphaFade = 1 - easeOutQuart(s.localProgress);
      const alphaBase = s.isSmall ? 0.22 : 0.30;
      const alpha = Math.max(0, alphaBase * alphaFade + 0.02 * (1 - s.localProgress));

      const finalSize = lerp(
        s.baseSize * 0.74,
        s.isSmall ? 0.34 : 0.58,
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

  function startTransition(href) {
    if (state !== "idle") return;

    nextHref = href;
    state = "shatter";
    stateStart = nowMs();

    document.body.classList.add("is-transitioning");
    if (langSelect) langSelect.classList.add("is-disabled");

    const { x, y } = getCenter();
    const r = getOrbRadius();

    createShards(x, y, r);
    ensureFinalLogo();
  }

  function maybeAdvanceState(now) {
    const elapsed = now - stateStart;

    if (state === "shatter" && elapsed >= CONFIG.shatterDuration) {
      state = "converge";
      stateStart = now;
      return;
    }

    if (state === "converge" && elapsed >= CONFIG.convergeDuration) {
      state = "bloom";
      stateStart = now;
      createBloomParticles();
      return;
    }

    // bloom の終わりで即ロゴではなく少し間を置きつつ、
    // まだ吸い込まれている最中にロゴへ移る
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

      drawAmbientVoid(cx, cy, r, t, orbAlpha * 0.55);
      drawShadow(cx, cy, r, orbAlpha * 0.75);
      drawOrbBody(cx, cy, r, t, orbAlpha, orbScale);
      drawInteriorTexture(cx, cy, r, t, orbAlpha, orbScale);
      drawHighlight(cx, cy, r, t, orbAlpha, orbScale);

      drawShardsExplode(p);
      return;
    }

    if (state === "converge") {
      const p = clamp((now - stateStart) / CONFIG.convergeDuration, 0, 1);
      drawAmbientVoid(cx, cy, r, t, 0.13 * (1 - p));
      drawShardsConverge(p);

      const preGlow = Math.max(0, (p - 0.72) / 0.28);
      if (preGlow > 0) drawCentralBloom(preGlow * 0.72);

      return;
    }

    if (state === "bloom") {
      const p = clamp((now - stateStart) / CONFIG.bloomDuration, 0, 1);
      drawCentralBloom(p);
      drawBloomParticles(p);

      // bloom 中もまだ中央に吸わせ続ける
      drawShardsConverge(0.88 + p * 0.12);
      return;
    }

    if (state === "logo") {
      // ロゴを見せつつ、ごく短く収束の残像感だけ残す
      const p = clamp((now - stateStart) / Math.max(1, CONFIG.logoHoldDuration * 0.42), 0, 1);
      if (p < 1) {
        drawShardsConverge(0.97 + p * 0.03);
        drawCentralBloom(0.72 + p * 0.28);
      }
      return;
    }
  }

  function tick(now = nowMs()) {
    if (!motionQuery.matches) {
      time += 0.016;
    }

    render(now);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(rafId);
    resize();
    tick();
  }

function getDefaultHref() {
  const link =
    document.querySelector(".lang-link.is-active") ||
    document.querySelector(".lang-link");

  return link ? link.getAttribute("href") : null;
}

function handleScreenTrigger(e) {
  if (state !== "idle") return;

  const href = getDefaultHref();
  if (!href) return;

  if (e && e.preventDefault) e.preventDefault();

  startTransition(href);
}
window.addEventListener("pointerdown", handleScreenTrigger, { passive:false });

window.addEventListener("resize", resize);

if (motionQuery.addEventListener) {
  motionQuery.addEventListener("change", start);
} else if (motionQuery.addListener) {
  motionQuery.addListener(start);
}

resize();
tick();
})();