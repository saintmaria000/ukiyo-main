(() => {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CONFIG = {
    orbScale: 0.155,
    orbMin: 110,
    orbMax: 250,

    idleOutlineAlpha: 0.038,
    idleCoreAlpha: 0.012,

    wave1Amp: 0.020,
    wave2Amp: 0.012,
    wave3Amp: 0.008,
    wave4Amp: 0.005,

    shatterDuration: 2000,
    convergeDuration: 1700,
    logoDelay: 360,
    logoDurationBeforeNavigate: 1000,

    shardCount: 110,          // 多すぎない、でも十分
    shardMinSize: 1.8,
    shardMaxSize: 13.0,

    explodeRadiusMin: 900,
    explodeRadiusMax: 2400,

    camera: 900,              // 小さいほど手前感が強い
    zNearLimit: -700,
    zFarLimit: 2000,

    convergeSnapStrength: 0.050
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

  function safe(n, fallback = 0) {
    return Number.isFinite(n) ? n : fallback;
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
    const breathing = 1 + Math.sin(time * 0.16) * 0.010;
    const result = r * breathing;

    return Number.isFinite(result) ? result : 120;
  }

  function radiusAt(theta, baseR, t) {
    const wave1 = Math.sin(theta * 2.0 + t * 0.65) * baseR * CONFIG.wave1Amp;
    const wave2 = Math.sin(theta * 3.0 - t * 0.42 + 0.9) * baseR * CONFIG.wave2Amp;
    const wave3 = Math.sin(theta * 5.0 + t * 0.24 - 1.2) * baseR * CONFIG.wave3Amp;
    const wave4 = Math.sin(theta * 8.0 - t * 0.16 + 2.1) * baseR * CONFIG.wave4Amp;
    const breath = Math.sin(t * 0.12) * baseR * 0.006;

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
    const driftX = Math.sin(t * 0.18) * r * 0.03;
    const driftY = Math.cos(t * 0.14) * r * 0.03;

    const g = ctx.createRadialGradient(
      safe(cx + driftX, cx),
      safe(cy + driftY, cy),
      safe(Math.max(0.0001, r * 0.12), 1),
      safe(cx, cx),
      safe(cy, cy),
      safe(Math.max(0.0001, r * 2.5), r * 2.5)
    );

    g.addColorStop(0, `rgba(255,255,255,${0.010 * alphaMul})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.004 * alphaMul})`);
    g.addColorStop(0.7, `rgba(255,255,255,${0.0015 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, r * 2.5), 0, Math.PI * 2);
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
        if (!Number.isFinite(dist) || dist > 1.02) continue;

        const v =
          Math.sin(nx * 5.8 + t * 0.72) +
          Math.sin(ny * 6.6 - t * 0.56) +
          Math.sin((nx + ny) * 4.4 + t * 0.34) +
          Math.sin((nx - ny) * 3.8 - t * 0.22);

        const alpha = ((v + 4) / 8) * 0.010 * alphaMul;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
        ctx.fillRect(px, py, cellW + 0.35, cellH + 0.35);
      }
    }

    ctx.restore();
  }

  function drawHighlight(cx, cy, r, t, alphaMul = 1, scale = 1) {
    const hx = cx - r * 0.26 * scale + Math.sin(t * 0.42) * r * 0.015;
    const hy = cy - r * 0.31 * scale + Math.cos(t * 0.30) * r * 0.015;

    const g = ctx.createRadialGradient(
      safe(hx, cx),
      safe(hy, cy),
      safe(Math.max(0.0001, r * 0.01), 1),
      safe(hx, cx),
      safe(hy, cy),
      safe(Math.max(0.0001, r * 0.24 * scale), r * 0.2)
    );

    g.addColorStop(0, `rgba(255,255,255,${0.06 * alphaMul})`);
    g.addColorStop(0.24, `rgba(255,255,255,${0.022 * alphaMul})`);
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

    for (let i = 0; i < CONFIG.shardCount; i++) {
      // 球の表面から生まれる
      const dir = randomUnitVector3();

      const startRadius = r * (0.75 + Math.random() * 0.25);
      const startX = cx + dir.x * startRadius;
      const startY = cy + dir.y * startRadius;
      const startZ = dir.z * r * 0.9;

      // 飛散方向もほぼその法線方向
      const explodeLength = lerp(CONFIG.explodeRadiusMin, CONFIG.explodeRadiusMax, Math.random());
      const targetX = cx + dir.x * explodeLength;
      const targetY = cy + dir.y * explodeLength;
      const targetZ = dir.z * explodeLength;

      // 手前に来る破片ほど大きく明るく
      const frontness = (dir.z + 1) * 0.5;
      const size = lerp(CONFIG.shardMinSize, CONFIG.shardMaxSize, Math.random()) * lerp(0.8, 1.35, frontness);
      const alpha = lerp(0.10, 0.28, frontness);
      const aspect = 0.8 + Math.random() * 2.4;
      const spin = (Math.random() - 0.5) * lerp(0.10, 0.34, frontness);

      shards.push({
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

        logoTargetX: cx,
        logoTargetY: cy,
        logoTargetZ: 0,

        distFromCenterNorm: 1,
        frontness
      });
    }
  }

  function project3D(x, y, z) {
    const cam = CONFIG.camera;
    const zz = clamp(z, CONFIG.zNearLimit, CONFIG.zFarLimit);
    const p = cam / (cam + zz);

    return {
      x,
      y,
      scale: clamp(p, 0.18, 4.5),
      visible: cam + zz > 1
    };
  }

  function drawGlassShard3D(x, y, z, size, aspect, rot, alpha, frontness) {
    const proj = project3D(x, y, z);
    if (!proj.visible) return;

    const drawSize = size * proj.scale;
    const drawAlpha = alpha * clamp(proj.scale * 0.9, 0.14, 1.9);

    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(rot);

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
    ctx.lineWidth = clamp(0.45 * proj.scale, 0.35, 1.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-drawSize * 0.52 * aspect, -drawSize * 0.05);
    ctx.lineTo(drawSize * 0.70 * aspect, -drawSize * 0.02);
    ctx.strokeStyle = `rgba(255,255,255,${drawAlpha * lerp(0.30, 0.90, frontness)})`;
    ctx.lineWidth = clamp(0.30 * proj.scale, 0.22, 1.0);
    ctx.stroke();

    ctx.restore();
  }

  function shatterMotion(progress) {
    // 最初に強く出て、その後かなり減速
    return 1 - Math.pow(1 - progress, 4.6);
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
      const alpha = s.alpha * (1 - progress * 0.16);
      drawGlassShard3D(s.x, s.y, s.z, s.size, s.aspect, s.rot, alpha, s.frontness);
    });
  }

  function buildLogoTargets() {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const gap = Math.min(w, h) * 0.095;
    const scale = Math.min(w, h) * 0.0078;

    const glyphs = [
      {
        ox: -gap,
        oy: 0,
        matrix: [
          "  xxx ",
          " x   x",
          "xxxxx ",
          "x xxx ",
          "x x x ",
          "xxxxx ",
          "x   x ",
          "x   x "
        ]
      },
      {
        ox: 0,
        oy: 0,
        matrix: [
          " xxx  ",
          "   x  ",
          " xxxx ",
          " x  x ",
          " xxxx ",
          " x    ",
          " xxxx ",
          "      "
        ]
      },
      {
        ox: gap,
        oy: 0,
        matrix: [
          "xxxxx ",
          "  x   ",
          "xxxxx ",
          "x  xx ",
          "x   x ",
          "xxxxx ",
          "      ",
          "      "
        ]
      }
    ];

    const targets = [];

    glyphs.forEach((g) => {
      g.matrix.forEach((row, iy) => {
        for (let ix = 0; ix < row.length; ix++) {
          if (row[ix] !== "x") continue;

          const baseX = cx + g.ox + (ix - row.length / 2) * scale * 1.7;
          const baseY = cy + g.oy + (iy - g.matrix.length / 2) * scale * 2.0;

          for (let n = 0; n < 10; n++) {
            targets.push({
              x: baseX + (Math.random() - 0.5) * scale * 0.9,
              y: baseY + (Math.random() - 0.5) * scale * 0.9,
              z: lerp(-20, 20, Math.random())
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

    const center = getCenter();
    const maxDist = Math.max(Math.hypot(center.x, center.y), 1);

    shards.forEach((s, i) => {
      const target = targets[i % targets.length];
      s.logoTargetX = target.x;
      s.logoTargetY = target.y;
      s.logoTargetZ = target.z;

      const dist = Math.hypot(s.x - center.x, s.y - center.y);
      s.distFromCenterNorm = clamp(dist / maxDist, 0, 1);
    });
  }

  function drawShardsConverge(progress) {
    const pull = easeInCubic(progress);
    const drawList = [];

    shards.forEach((s) => {
      const speedBias = lerp(1.35, 0.42, s.distFromCenterNorm);
      const snap = CONFIG.convergeSnapStrength * speedBias * (0.20 + pull * 2.9);
      const drag = lerp(0.95, lerp(0.84, 0.90, s.distFromCenterNorm), pull);

      s.vx += (s.logoTargetX - s.x) * snap;
      s.vy += (s.logoTargetY - s.y) * snap;
      s.vz += (s.logoTargetZ - s.z) * snap * 0.85;

      s.vx *= drag;
      s.vy *= drag;
      s.vz *= drag;

      s.x += s.vx;
      s.y += s.vy;
      s.z += s.vz;

      s.rot += s.spin * (0.18 + (1 - pull) * 0.65);

      drawList.push(s);
    });

    drawList.sort((a, b) => a.z - b.z);

    drawList.forEach((s) => {
      const alpha = lerp(0.05, 0.32, pull);
      const finalSize = lerp(s.baseSize * 0.76, 1.5, pull);
      const finalAspect = lerp(s.aspect, 1.0, pull);

      drawGlassShard3D(
        s.x,
        s.y,
        s.z,
        finalSize,
        finalAspect,
        s.rot,
        alpha,
        s.frontness
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
      drawAmbientVoid(cx, cy, r, t, 0.12 * (1 - p));
      drawShardsConverge(p);
      return;
    }

    if (state === "logo") {
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

  langLinks.forEach((link) => {
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

  resize();
  tick();
})();

// b