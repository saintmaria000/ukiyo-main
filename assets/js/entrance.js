(() => {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const langLinks = document.querySelectorAll(".lang-link");
  const langSelect = document.querySelector(".lang-select");
  const revealLogo = document.getElementById("revealLogo");

  let w = 0;
  let h = 0;
  let dpr = 1;
  let rafId = 0;
  let time = 0;

  let state = "idle"; // idle | shatter | converge | logo
  let stateStart = 0;
  let nextHref = null;

  let shards = [];
  let crackLines = [];

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CONFIG = {
    orbScale: 0.155,
    orbMin: 110,
    orbMax: 250,

    idleOutlineAlpha: 0.040,
    idleCoreAlpha: 0.012,
    idleGlowAlpha: 0.020,

    wave1Amp: 0.020,
    wave2Amp: 0.012,
    wave3Amp: 0.008,
    wave4Amp: 0.005,

    shatterDuration: 1200,
    convergeDuration: 1100,
    logoDelay: 420,

    shardCount: 120,
    shardMinSize: 1.2,
    shardMaxSize: 8.5,

    crackCount: 18,

    explodeDistanceMin: 0.95,
    explodeDistanceMax: 1.55,

    convergeSnapStrength: 0.050,
    convergeDrag: 0.86,

    logoDurationBeforeNavigate: 900
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

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getCenter() {
    return { x: w * 0.5, y: h * 0.5 };
  }

  function getOrbRadius() {
    const base = clamp(Math.min(w, h) * CONFIG.orbScale, CONFIG.orbMin, CONFIG.orbMax);
    return base * (1 + Math.sin(time * 0.16) * 0.010);
  }

  function radiusAt(theta, baseR, t) {
    const wave1 = Math.sin(theta * 2.0 + t * 0.65) * baseR * CONFIG.wave1Amp;
    const wave2 = Math.sin(theta * 3.0 - t * 0.42 + 0.9) * baseR * CONFIG.wave2Amp;
    const wave3 = Math.sin(theta * 5.0 + t * 0.24 - 1.2) * baseR * CONFIG.wave3Amp;
    const wave4 = Math.sin(theta * 8.0 - t * 0.16 + 2.1) * baseR * CONFIG.wave4Amp;
    const breath = Math.sin(t * 0.12) * baseR * 0.006;
    return baseR + wave1 + wave2 + wave3 + wave4 + breath;
  }

  function buildOrbPath(cx, cy, baseR, t, scale = 1) {
    const steps = 220;
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const r = radiusAt(theta, baseR, t) * scale;
      pts.push({
        x: cx + Math.cos(theta) * r,
        y: cy + Math.sin(theta) * r
      });
    }

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
    const driftX = Math.sin(t * 0.18) * r * 0.03;
    const driftY = Math.cos(t * 0.14) * r * 0.03;

    const g = ctx.createRadialGradient(
      cx + driftX,
      cy + driftY,
      r * 0.12,
      cx,
      cy,
      r * 2.4
    );

    g.addColorStop(0, `rgba(255,255,255,${0.010 * alphaMul})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.004 * alphaMul})`);
    g.addColorStop(0.7, `rgba(255,255,255,${0.0015 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShadow(cx, cy, r, alphaMul = 1) {
    const g = ctx.createRadialGradient(
      cx,
      cy + r * 0.34,
      r * 0.15,
      cx,
      cy + r * 0.34,
      r * 1.0
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
      cx - r * 0.24,
      cy - r * 0.28,
      r * 0.05,
      cx,
      cy,
      r * 1.15
    );

    body.addColorStop(0, `rgba(255,255,255,${0.055 * alphaMul})`);
    body.addColorStop(0.28, `rgba(255,255,255,${0.024 * alphaMul})`);
    body.addColorStop(0.56, `rgba(255,255,255,${0.014 * alphaMul})`);
    body.addColorStop(0.8, `rgba(255,255,255,${CONFIG.idleCoreAlpha * alphaMul})`);
    body.addColorStop(1, `rgba(255,255,255,${0.005 * alphaMul})`);

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
        if (dist > 1.02) continue;

        const v =
          Math.sin(nx * 5.8 + t * 0.72) +
          Math.sin(ny * 6.6 - t * 0.56) +
          Math.sin((nx + ny) * 4.4 + t * 0.34) +
          Math.sin((nx - ny) * 3.8 - t * 0.22);

        const alpha = ((v + 4) / 8) * 0.010 * alphaMul;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(px, py, cellW + 0.35, cellH + 0.35);
      }
    }

    ctx.restore();
  }

  function drawHighlight(cx, cy, r, t, alphaMul = 1, scale = 1) {
    const hx = cx - r * 0.26 * scale + Math.sin(t * 0.42) * r * 0.015;
    const hy = cy - r * 0.31 * scale + Math.cos(t * 0.30) * r * 0.015;

    const g = ctx.createRadialGradient(
      hx, hy, r * 0.01,
      hx, hy, r * 0.24 * scale
    );

    g.addColorStop(0, `rgba(255,255,255,${0.06 * alphaMul})`);
    g.addColorStop(0.24, `rgba(255,255,255,${0.022 * alphaMul})`);
    g.addColorStop(0.58, `rgba(255,255,255,${0.008 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.24 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIdleOrb(cx, cy, r, t) {
    drawAmbientVoid(cx, cy, r, t, 1);
    drawShadow(cx, cy, r, 1);
    drawOrbBody(cx, cy, r, t, 1, 1);
    drawInteriorTexture(cx, cy, r, t, 1, 1);
    drawHighlight(cx, cy, r, t, 1, 1);
  }

  function createCrackLines(cx, cy, r) {
    crackLines = [];
    for (let i = 0; i < CONFIG.crackCount; i++) {
      const baseAngle = (Math.PI * 2 * i) / CONFIG.crackCount + (Math.random() - 0.5) * 0.16;
      const segments = 4 + Math.floor(Math.random() * 3);
      const pts = [{ x: cx, y: cy }];
      for (let s = 1; s <= segments; s++) {
        const rr = r * (0.18 + (s / segments) * (0.78 + Math.random() * 0.18));
        const aa = baseAngle + (Math.random() - 0.5) * 0.30;
        pts.push({
          x: cx + Math.cos(aa) * rr,
          y: cy + Math.sin(aa) * rr
        });
      }
      crackLines.push(pts);
    }
  }

  function createShards(cx, cy, r) {
    shards = [];
    const maxSide = Math.max(w, h);

    for (let i = 0; i < CONFIG.shardCount; i++) {
      const angle = (Math.PI * 2 * i) / CONFIG.shardCount + (Math.random() - 0.5) * 0.22;
      const speedMul = 0.75 + Math.random() * 0.9;
      const distNorm = CONFIG.explodeDistanceMin + Math.random() * (CONFIG.explodeDistanceMax - CONFIG.explodeDistanceMin);
      const targetDist = maxSide * distNorm * speedMul;

      const sx = cx + Math.cos(angle) * r * (0.10 + Math.random() * 0.10);
      const sy = cy + Math.sin(angle) * r * (0.10 + Math.random() * 0.10);

      const tx = cx + Math.cos(angle) * targetDist;
      const ty = cy + Math.sin(angle) * targetDist;

      const size = CONFIG.shardMinSize + Math.random() * (CONFIG.shardMaxSize - CONFIG.shardMinSize);
      const spin = (Math.random() - 0.5) * 0.28;
      const aspect = 0.8 + Math.random() * 2.4;

      shards.push({
        startX: sx,
        startY: sy,
        x: sx,
        y: sy,
        targetX: tx,
        targetY: ty,
        vx: 0,
        vy: 0,
        size,
        aspect,
        rot: Math.random() * Math.PI * 2,
        spin,
        alpha: 0.14 + Math.random() * 0.18,
        targetIndex: 0
      });
    }
  }

  function drawCracks(progress) {
    const grow = easeOutCubic(progress);
    const alpha = 0.30 * (1 - progress) + 0.06;

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1;

    crackLines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);

      const end = Math.max(2, Math.floor(line.length * grow));
      for (let i = 1; i < Math.min(end, line.length); i++) {
        ctx.lineTo(line[i].x, line[i].y);
      }

      ctx.stroke();
    });

    ctx.restore();
  }

  function drawShardsExplode(progress) {
    // 近くは素早く、遠くほど終盤が遅く見えるようなカーブ
    const move = 1 - Math.pow(1 - progress, 5);

    shards.forEach(s => {
      const x = lerp(s.startX, s.targetX, move);
      const y = lerp(s.startY, s.targetY, move);

      s.x = x;
      s.y = y;
      s.rot += s.spin;

      const alpha = s.alpha * (1 - progress * 0.28);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rot);

      ctx.beginPath();
      ctx.ellipse(0, 0, s.size * s.aspect, s.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();

      ctx.restore();
    });
  }

  function buildLogoTargets() {
    // 画面中央付近に「憂き世」っぽい密度ブロックを作る簡易ターゲット
    // フォントアウトライン取得なしで、収束感を優先
    const cx = w * 0.5;
    const cy = h * 0.5;
    const gap = Math.min(w, h) * 0.095;
    const scale = Math.min(w, h) * 0.0075;

    const glyphs = [
      { ox: -gap, oy: 0, matrix: [
        "  xxx ",
        " x   x",
        "xxxxx ",
        "x xxx ",
        "x x x ",
        "xxxxx ",
        "x   x ",
        "x   x "
      ]},
      { ox: 0, oy: 0, matrix: [
        " xxx  ",
        "   x  ",
        " xxxx ",
        " x  x ",
        " xxxx ",
        " x    ",
        " xxxx ",
        "      "
      ]},
      { ox: gap, oy: 0, matrix: [
        "xxxxx ",
        "  x   ",
        "xxxxx ",
        "x  xx ",
        "x   x ",
        "xxxxx ",
        "      ",
        "      "
      ]}
    ];

    const targets = [];

    glyphs.forEach(g => {
      g.matrix.forEach((row, iy) => {
        for (let ix = 0; ix < row.length; ix++) {
          if (row[ix] !== "x") continue;
          const baseX = cx + g.ox + (ix - row.length / 2) * scale * 1.7;
          const baseY = cy + g.oy + (iy - g.matrix.length / 2) * scale * 2.0;

          for (let n = 0; n < 8; n++) {
            targets.push({
              x: baseX + (Math.random() - 0.5) * scale * 0.9,
              y: baseY + (Math.random() - 0.5) * scale * 0.9
            });
          }
        }
      });
    });

    return targets;
  }

  function assignTargets() {
    const targets = buildLogoTargets();
    if (!targets.length) return;

    shards.forEach((s, i) => {
      s.targetIndex = i % targets.length;
      s.logoTargetX = targets[s.targetIndex].x;
      s.logoTargetY = targets[s.targetIndex].y;
    });
  }

  function drawShardsConverge(progress) {
    // 戻る瞬間ほど速く。最初は遠くで漂い、終盤に強く吸われる。
    const pull = easeInCubic(progress);

    shards.forEach(s => {
      const ax = (s.logoTargetX - s.x) * (CONFIG.convergeSnapStrength * (0.35 + pull * 2.4));
      const ay = (s.logoTargetY - s.y) * (CONFIG.convergeSnapStrength * (0.35 + pull * 2.4));

      s.vx += ax;
      s.vy += ay;

      // 遠くでは緩く、終盤だけドラッグを弱めて急加速っぽく見せる
      const dynamicDrag = lerp(0.93, CONFIG.convergeDrag, pull);
      s.vx *= dynamicDrag;
      s.vy *= dynamicDrag;

      s.x += s.vx;
      s.y += s.vy;
      s.rot += s.spin * (0.4 + (1 - pull) * 0.8);

      const alpha = lerp(0.05, 0.28, pull);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      const finalSize = lerp(s.size * 0.72, 1.8, pull);
      const finalAspect = lerp(s.aspect, 1.0, pull);

      ctx.beginPath();
      ctx.ellipse(0, 0, finalSize * finalAspect, finalSize, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();

      ctx.restore();
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

    createCrackLines(x, y, r);
    createShards(x, y, r);
  }

  function maybeAdvanceState(now) {
    const elapsed = now - stateStart;

    if (state === "shatter" && elapsed >= CONFIG.shatterDuration) {
      state = "converge";
      stateStart = now;
      assignTargets();
      return;
    }

    if (state === "converge" && elapsed >= CONFIG.convergeDuration) {
      state = "logo";
      stateStart = now;
      if (revealLogo) revealLogo.classList.add("is-visible");
      return;
    }

    if (state === "logo" && elapsed >= CONFIG.logoDelay + CONFIG.logoDurationBeforeNavigate) {
      window.location.href = nextHref;
    }
  }

  function render(now) {
    drawBackground();

    const { x: cx, y: cy } = getCenter();
    const r = getOrbRadius();
    const t = time * CONFIG.speed;

    if (state === "idle") {
      drawIdleOrb(cx, cy, r, t);
      return;
    }

    maybeAdvanceState(now);

    if (state === "shatter") {
      const p = clamp((now - stateStart) / CONFIG.shatterDuration, 0, 1);

      const orbAlpha = Math.max(0, 1 - easeOutCubic(p) * 1.05);
      const orbScale = lerp(1, 0.92, p);

      drawAmbientVoid(cx, cy, r, t, orbAlpha * 0.6);
      drawShadow(cx, cy, r, orbAlpha * 0.8);
      drawOrbBody(cx, cy, r, t, orbAlpha, orbScale);
      drawInteriorTexture(cx, cy, r, t, orbAlpha, orbScale);
      drawHighlight(cx, cy, r, t, orbAlpha, orbScale);

      drawCracks(Math.min(p * 1.1, 1));
      drawShardsExplode(p);
      return;
    }

    if (state === "converge") {
      const p = clamp((now - stateStart) / CONFIG.convergeDuration, 0, 1);

      drawAmbientVoid(cx, cy, r, t, 0.12 * (1 - p));
      drawShardsConverge(p);
      return;
    }

    if (state === "logo") {
      // ロゴが出た後も少しだけ残粒子
      drawShardsConverge(1);
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

  langLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      startTransition(link.getAttribute("href"));
    });
  });

  window.addEventListener("resize", resize);

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", start);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(start);
  }

  start();
})();