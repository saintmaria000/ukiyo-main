(() => {
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");

  const langLinks = document.querySelectorAll(".lang-link");
  const langSelect = document.querySelector(".lang-select");
  const revealLogo = document.getElementById("revealLogo");

  let w = 0;
  let h = 0;
  let dpr = 1;
  let time = 0;
  let animationId = null;

  let state = "idle"; // idle | burst | logo | done
  let stateStart = 0;
  let nextHref = null;

  let droplets = [];
  let ripples = [];

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CONFIG = {
    orbScale: 0.155,
    orbMin: 110,
    orbMax: 250,

    outlineAlpha: 0.035,
    glowAlpha: 0.015,
    coreAlpha: 0.010,

    wave1Amp: 0.020,
    wave2Amp: 0.012,
    wave3Amp: 0.008,
    wave4Amp: 0.005,

    speed: 0.48,

    bandCount: 5,
    bandAlpha: 0.008,

    textureCols: 56,
    textureRows: 56,
    textureAlpha: 0.010,

    causticLines: 14,
    causticAlpha: 0.007
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    return {
      x: w * 0.5,
      y: h * 0.5
    };
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
      r * 0.18,
      cx,
      cy,
      r * 2.2
    );

    g.addColorStop(0, `rgba(255,255,255,${0.010 * alphaMul})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.004 * alphaMul})`);
    g.addColorStop(0.7, `rgba(255,255,255,${0.0015 * alphaMul})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.3, 0, Math.PI * 2);
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

    g.addColorStop(0, `rgba(0,0,0,${0.14 * alphaMul})`);
    g.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.36, r * 0.72, r * 0.40, 0, 0, Math.PI * 2);
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
    body.addColorStop(0.8, `rgba(255,255,255,${CONFIG.coreAlpha * alphaMul})`);
    body.addColorStop(1, `rgba(255,255,255,${0.005 * alphaMul})`);

    ctx.fillStyle = body;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${CONFIG.outlineAlpha * alphaMul})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawRefractionTexture(cx, cy, r, t, alphaMul = 1, scale = 1) {
    ctx.save();
    buildOrbPath(cx, cy, r, t, scale);
    ctx.clip();

    const cols = CONFIG.textureCols;
    const rows = CONFIG.textureRows;
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

        const alpha = ((v + 4) / 8) * CONFIG.textureAlpha * alphaMul;

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(px, py, cellW + 0.35, cellH + 0.35);
      }
    }

    ctx.restore();
  }

  function drawInteriorBands(cx, cy, r, t, alphaMul = 1, scale = 1) {
    ctx.save();
    buildOrbPath(cx, cy, r, t, scale);
    ctx.clip();

    for (let i = 0; i < CONFIG.bandCount; i++) {
      const ratio = i / Math.max(CONFIG.bandCount - 1, 1);
      const yy = cy - r * 0.62 * scale + ratio * r * 1.24 * scale;
      const amp = r * scale * (0.010 + i * 0.0018);
      const freq = 1.2 + i * 0.20;
      const phase = t * (0.34 + i * 0.04) + i * 0.8;

      ctx.beginPath();

      for (let x = cx - r * 1.12 * scale, first = true; x <= cx + r * 1.12 * scale; x += 2.5) {
        const nx = (x - cx) / (r * scale);

        const y =
          yy +
          Math.sin(nx * Math.PI * freq + phase) * amp +
          Math.sin(nx * Math.PI * (freq * 0.62) - phase * 0.74) * amp * 0.42;

        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = `rgba(255,255,255,${(CONFIG.bandAlpha + i * 0.0018) * alphaMul})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCausticLines(cx, cy, r, t, alphaMul = 1, scale = 1) {
    ctx.save();
    buildOrbPath(cx, cy, r, t, scale);
    ctx.clip();

    for (let i = 0; i < CONFIG.causticLines; i++) {
      const ratio = i / Math.max(CONFIG.causticLines - 1, 1);
      const yy = cy - r * 0.92 * scale + ratio * r * 1.84 * scale;
      const phase = t * (0.52 + ratio * 0.34) + i * 0.36;
      const alpha = CONFIG.causticAlpha * (1 - Math.abs(ratio - 0.5) * 1.35) * alphaMul;

      ctx.beginPath();

      for (let x = cx - r * 1.15 * scale, first = true; x <= cx + r * 1.15 * scale; x += 2.2) {
        const nx = (x - cx) / (r * scale);
        const y =
          yy +
          Math.sin(nx * Math.PI * 2.6 + phase) * r * scale * 0.008 +
          Math.sin(nx * Math.PI * 5.4 - phase * 0.82) * r * scale * 0.004;

        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = `rgba(255,255,255,${Math.max(alpha, 0)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawHighlight(cx, cy, r, t, alphaMul = 1, scale = 1) {
    const hx = cx - r * 0.26 * scale + Math.sin(t * 0.42) * r * 0.015;
    const hy = cy - r * 0.31 * scale + Math.cos(t * 0.30) * r * 0.015;

    const g = ctx.createRadialGradient(
      hx,
      hy,
      r * 0.01,
      hx,
      hy,
      r * 0.24 * scale
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
    drawRefractionTexture(cx, cy, r, t, 1, 1);
    drawInteriorBands(cx, cy, r, t, 1, 1);
    drawCausticLines(cx, cy, r, t, 1, 1);
    drawHighlight(cx, cy, r, t, 1, 1);
  }

  function createBurst(cx, cy, r) {
    droplets = [];
    ripples = [];

    const count = 56;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.14;
      const speed = r * (0.010 + Math.random() * 0.020);
      const start = r * (0.05 + Math.random() * 0.10);

      droplets.push({
        x: cx + Math.cos(angle) * start,
        y: cy + Math.sin(angle) * start,
        angle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: r * (0.010 + Math.random() * 0.030),
        stretch: 1.2 + Math.random() * 1.5,
        rot: angle,
        alpha: 0.16 + Math.random() * 0.10
      });
    }

    for (let i = 0; i < 3; i++) {
      ripples.push({
        r: r * (0.18 + i * 0.08),
        alpha: 0.10 - i * 0.02
      });
    }
  }

  function drawBurstDroplets(progress) {
    const p = easeOutCubic(progress);

    droplets.forEach(d => {
      const x = d.x + d.vx * p * 42;
      const y = d.y + d.vy * p * 42;
      const size = d.size * (1 - progress * 0.24);
      const alpha = Math.max(0, d.alpha * (1 - progress));

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.rot);

      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        size * d.stretch,
        size,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();

      ctx.restore();
    });
  }

  function drawBurstRipples(cx, cy, r, progress) {
    const p = easeOutCubic(progress);

    ripples.forEach((ring, i) => {
      const rr = ring.r + r * p * (0.26 + i * 0.08);
      const alpha = Math.max(0, ring.alpha * (1 - progress));

      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawWaterTear(cx, cy, r, t, progress) {
    const p = easeInOutCubic(progress);
    const alphaMul = Math.max(0, 1 - p * 1.08);
    const shrink = 1 - p * 0.30;

    drawAmbientVoid(cx, cy, r, t, alphaMul * 0.6);
    drawShadow(cx, cy, r, alphaMul);
    drawOrbBody(cx, cy, r, t, alphaMul, shrink);
    drawRefractionTexture(cx, cy, r, t, alphaMul, shrink);
    drawInteriorBands(cx, cy, r, t, alphaMul, shrink);
    drawCausticLines(cx, cy, r, t, alphaMul, shrink);
    drawHighlight(cx, cy, r, t, alphaMul, shrink);

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    const split = r * (0.02 + p * 0.24);
    const wobble = Math.sin(t * 1.6) * r * 0.01;

    ctx.beginPath();
    ctx.moveTo(cx - split * 0.55, cy - r * 0.96);
    ctx.bezierCurveTo(
      cx - split * 1.35 + wobble,
      cy - r * 0.42,
      cx + split * 1.35 - wobble,
      cy + r * 0.08,
      cx + split * 0.25,
      cy + r * 0.98
    );
    ctx.lineWidth = Math.max(1, r * (0.012 + p * 0.045));
    ctx.stroke();

    ctx.restore();

    drawBurstRipples(cx, cy, r, progress);
    drawBurstDroplets(progress);
  }

  function startTransition(href) {
    if (state !== "idle") return;

    nextHref = href;
    state = "burst";
    stateStart = performance.now();

    document.body.classList.add("is-transitioning");
    langSelect.classList.add("is-disabled");

    const { x, y } = getCenter();
    const r = getOrbRadius();
    createBurst(x, y, r);
  }

  function updateState(now) {
    const elapsed = now - stateStart;

    if (state === "burst" && elapsed > 760) {
      state = "logo";
      revealLogo.classList.add("is-visible");
    }

    if (state === "logo" && elapsed > 1780) {
      state = "done";
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

    updateState(now);

    if (state === "burst") {
      const progress = Math.min((now - stateStart) / 760, 1);
      drawWaterTear(cx, cy, r, t, progress);
      return;
    }

    if (state === "logo" || state === "done") {
      const burstProgress = Math.min((now - stateStart) / 980, 1);
      const fade = Math.max(0, 1 - (now - stateStart - 760) / 420);

      if (fade > 0) {
        drawAmbientVoid(cx, cy, r, t, fade * 0.18);
        drawBurstDroplets(Math.min(burstProgress + 0.12, 1));
      }
    }
  }

  function tick(now = performance.now()) {
    if (!motionQuery.matches) {
      time += 0.016;
    }

    render(now);
    animationId = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(animationId);
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