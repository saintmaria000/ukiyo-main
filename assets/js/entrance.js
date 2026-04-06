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
  ========================================================= */
  const DEFAULT_MOVE_PROFILE = {
    driftForceMul: 1,
    centerBiasMul: 1,
    maxSpeedMul: 1,
    noiseFreqMul: 1,
    wallBounceMul: 1,
    wallDampingMul: 1,
    gravityMul: 1,
    horizonPullMul: 0,
    targetPullMul: 1,
    tangentialMul: 0,
    separationMul: 1
  };

  const CONFIG = {
    bg: "#000000",

    horizonYMin: 0.58,
    horizonYMax: 0.62,

    water: {
      background: {
        areaBgColor: "#ff1515",
        areaBgAlpha: 0,
        areaBgSoftAlpha: 0,
        showAreaDebugFill: false,
        showAreaDebugStroke: false,
        areaStrokeColor: "rgba(255,255,255,0.10)"
      },

      area: {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        mainOffsetY: -54,

        fixedWidth: 500,
        fixedHeight: 400,

        sideInset: 18,
        topInset: 9,
        bottomInset: 20
      },

      main: {
        radius: 82,

        viewportMinScale: 0.74,
        viewportMaxScale: 1.12,
        responsiveBaseWidth: 1440,
        responsiveBaseHeight: 900,

        wobbleAmp: 0.102,
        wobbleSpeedA: 0.92,
        wobbleSpeedB: 1.42,
        rippleAmpA: 0.010,
        rippleAmpB: 0.008
      },

      aux: {
        instances: [
          {
            name: "auxA",
            radius: 34,
            alpha: 0.96,
            spawnPreset: {
              angleDeg: 214,
              distMul: 1.10,
              angleJitterDeg: 14,
              distJitterMul: 0.10
            },
            moveProfile: {
              driftForceMul: 0.92,
              centerBiasMul: 0.12,
              maxSpeedMul: 0.82,
              noiseFreqMul: 0.88,
              wallBounceMul: 0.94,
              wallDampingMul: 1.0,
              gravityMul: 0.26,
              horizonPullMul: 0.12,
              targetPullMul: 0.78,
              tangentialMul: 0.28,
              separationMul: 1.05
            }
          },
          {
            name: "auxB",
            radius: 27,
            alpha: 0.94,
            spawnPreset: {
              angleDeg: 326,
              distMul: 1.20,
              angleJitterDeg: 16,
              distJitterMul: 0.11
            },
            moveProfile: {
              driftForceMul: 0.98,
              centerBiasMul: 0.10,
              maxSpeedMul: 0.88,
              noiseFreqMul: 0.94,
              wallBounceMul: 0.96,
              wallDampingMul: 1.0,
              gravityMul: 0.34,
              horizonPullMul: 0.16,
              targetPullMul: 0.92,
              tangentialMul: 0.36,
              separationMul: 1.14
            }
          },
          {
            name: "auxC",
            radius: 16,
            alpha: 0.92,
            spawnPreset: {
              angleDeg: 46,
              distMul: 1.68,
              angleJitterDeg: 22,
              distJitterMul: 0.15
            },
            moveProfile: {
              driftForceMul: 1.10,
              centerBiasMul: 0.08,
              maxSpeedMul: 1.00,
              noiseFreqMul: 1.08,
              wallBounceMul: 1.0,
              wallDampingMul: 0.99,
              gravityMul: 0.56,
              horizonPullMul: 0.38,
              targetPullMul: 1.04,
              tangentialMul: 0.50,
              separationMul: 1.28
            }
          },
          {
            name: "auxD",
            radius: 11,
            alpha: 0.90,
            spawnPreset: {
              angleDeg: 136,
              distMul: 1.52,
              angleJitterDeg: 24,
              distJitterMul: 0.16
            },
            moveProfile: {
              driftForceMul: 1.18,
              centerBiasMul: 0.06,
              maxSpeedMul: 1.08,
              noiseFreqMul: 1.16,
              wallBounceMul: 1.0,
              wallDampingMul: 0.98,
              gravityMul: 0.62,
              horizonPullMul: 0.46,
              targetPullMul: 1.10,
              tangentialMul: 0.58,
              separationMul: 1.36
            }
          }
        ],

        spawnGapFromMain: {
          auxA: 18,
          auxB: 20,
          auxC: 26,
          auxD: 30
        },

        motion: {
          driftForce: 2.15,
          driftDamping: 0.994,
          driftNoiseX: 2.7,
          driftNoiseY: 2.1,
          maxSpeed: 15.0,
          centerBias: 0.34,
          targetPull: 1.05,
          tangentialForce: 0.55,
          separationForce: 1.28,
          separationRangeMul: 1.9
        },

        wall: {
          wallBounce: 0.76,
          wallDamping: 0.9
        },

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

      contact: {
        contactStartMul: 1.78,
        contactFullMul: 1.08
      },

      metaball: {
        joinMul: 1.62,
        threshold: 148,
        blur: 9,
        pad: 28
      },

      halo: {
        radiusRatio: 0.16,
        alphaCore: 0.12,
        alphaMid: 0.05,

        followRevealLogo: true,
        useLogoSizeRadius: true,
        radiusMulFromLogo: 2.1,
        minRadius: 72,
        maxRadius: 280,
        offsetX: 0,
        offsetY: 0
      },

      waterSurface: {
        lineCount: 10,
        lineSpacing: 8,
        amp: 0.8
      },

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

    phase: {
      hint: 0.15,
      burst: 1.0,
      drift: 0.5,
      gather: 1.08,
      flash: 0.34,
      logo: 1.28
    },

    logoHoldAfterReveal: 1.42,

    logoMask: {
      fallbackText: "憂き世",
      sampleStep: 4,
      insetRatio: 0.08,
      alphaThreshold: 24
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

    logoTargets: [],
    logoTargetRect: null,

    water: {
      auxDroplets: [],
      metaballMaskCanvas: document.createElement("canvas"),
      metaballMaskCtx: null,
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

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

  function getRevealLogoMetrics() {
    const H = CONFIG.water.halo;

    const fallback = {
      x: cx + (H.offsetX || 0),
      y: cy - 10 + (H.offsetY || 0),
      width: 0,
      height: 0,
      hasRect: false
    };

    if (!H.followRevealLogo || !revealLogo) {
      return fallback;
    }

    const rect = revealLogo.getBoundingClientRect();
    const hasRect = rect.width > 0 && rect.height > 0;

    if (hasRect) {
      return {
        x: rect.left + rect.width * 0.5 + (H.offsetX || 0),
        y: rect.top + rect.height * 0.5 + (H.offsetY || 0),
        width: rect.width,
        height: rect.height,
        hasRect: true
      };
    }

    if (state.logoTargetRect) {
      return {
        x: state.logoTargetRect.left + state.logoTargetRect.width * 0.5 + (H.offsetX || 0),
        y: state.logoTargetRect.top + state.logoTargetRect.height * 0.5 + (H.offsetY || 0),
        width: state.logoTargetRect.width,
        height: state.logoTargetRect.height,
        hasRect: true
      };
    }

    return fallback;
  }

  function getHaloRadius(pulse) {
    const H = CONFIG.water.halo;
    const m = getRevealLogoMetrics();

    if (H.useLogoSizeRadius && m.hasRect) {
      const base = Math.max(m.width, m.height) * H.radiusMulFromLogo;
      return clamp(base * pulse, H.minRadius, H.maxRadius);
    }

    return Math.max(w, h) * H.radiusRatio * pulse;
  }

  /* =========================================================
     Sector 07. Logo Target Build
  ========================================================= */
  function buildLogoTargetPoints() {
    state.logoTargets.length = 0;
    state.logoTargetRect = null;

    if (!revealLogo) return;

    const prevVisibility = revealLogo.style.visibility;
    const prevOpacity = revealLogo.style.opacity;
    const prevDisplay = revealLogo.style.display;
    const prevTransform = revealLogo.style.transform;

    revealLogo.style.display = "block";
    revealLogo.style.visibility = "hidden";
    revealLogo.style.opacity = "0";
    revealLogo.style.transform = "translate(-50%, -50%)";

    const rect = revealLogo.getBoundingClientRect();
    const width = Math.max(8, Math.round(rect.width));
    const height = Math.max(8, Math.round(rect.height));

    state.logoTargetRect = {
      left: rect.left,
      top: rect.top,
      width,
      height
    };

    const text = (revealLogo.textContent || "").replace(/\s+/g, "").trim() || CONFIG.logoMask.fallbackText;
    const style = window.getComputedStyle(revealLogo);

    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) {
      revealLogo.style.display = prevDisplay;
      revealLogo.style.visibility = prevVisibility;
      revealLogo.style.opacity = prevOpacity;
      revealLogo.style.transform = prevTransform;
      return;
    }

    octx.clearRect(0, 0, width, height);
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";

    const fontStyle = style.fontStyle || "normal";
    const fontWeight = style.fontWeight || "400";
    const fontSize = style.fontSize || `${Math.max(24, Math.round(height * 0.7))}px`;
    const fontFamily = style.fontFamily || `"Yu Mincho", serif`;

    octx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;

    const insetX = width * CONFIG.logoMask.insetRatio;
    const insetY = height * CONFIG.logoMask.insetRatio;

    octx.save();
    octx.translate(width * 0.5, height * 0.5);
    octx.fillText(text, 0, 0);
    octx.restore();

    const img = octx.getImageData(0, 0, width, height).data;
    const pts = [];
    const step = CONFIG.logoMask.sampleStep;
    const threshold = CONFIG.logoMask.alphaThreshold;

    for (let y = Math.max(0, insetY | 0); y < height - insetY; y += step) {
      for (let x = Math.max(0, insetX | 0); x < width - insetX; x += step) {
        const a = img[(x + y * width) * 4 + 3];
        if (a >= threshold) {
          pts.push({
            x: rect.left + x,
            y: rect.top + y
          });
        }
      }
    }

    if (!pts.length) {
      pts.push({
        x: rect.left + width * 0.5,
        y: rect.top + height * 0.5
      });
    }

    state.logoTargets = shuffleInPlace(pts);

    revealLogo.style.display = prevDisplay;
    revealLogo.style.visibility = prevVisibility;
    revealLogo.style.opacity = prevOpacity;
    revealLogo.style.transform = prevTransform;
  }

  /* 中略: 既存の粒子/水ロジックはそのまま */

  /* =========================================================
     Sector 13. Background / Halo / Water
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

    const m = getRevealLogoMetrics();
    const r = getHaloRadius(pulse);

    const g = ctx.createRadialGradient(
      m.x,
      m.y,
      0,
      m.x,
      m.y,
      r
    );
    g.addColorStop(0, `rgba(255,255,255,${H.alphaCore})`);
    g.addColorStop(0.33, `rgba(255,255,255,${H.alphaMid})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* 以下は既存のまま */
})();

  /* =========================================================
     Sector 14. Reflection
  ========================================================= */
  function drawReflection(time, hintK) {
    ctx.save();

    ctx.beginPath();
    ctx.rect(0, horizonY, w, h - horizonY);
    ctx.clip();

    const items = [getMainRenderDroplet(time, hintK), ...getAuxRenderDroplets(time)];
    const groups = buildDropletGroups(items);

    for (const group of groups) {
      drawMetaballMirrorReflection(group, hintK);
    }

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
     Sector 15. Shards / Update
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
    const pull = lerp(
      8,
      CONFIG.gatherMaxPull,
      easeInExpo(Math.max(0, (tk - 0.18) / 0.82))
    );

    const targetX = s.targetX ?? cx;
    const targetY = s.targetY ?? cy;

    const toX = targetX - s.x;
    const toY = targetY - s.y;
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
      s.x = lerp(s.x, targetX, snap * 0.18);
      s.y = lerp(s.y, targetY, snap * 0.18);
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

      const targetX = s.targetX ?? cx;
      const targetY = s.targetY ?? cy;

      const toX = targetX - s.x;
      const toY = targetY - s.y;
      const dist = Math.hypot(toX, toY) || 1;
      const nx = toX / dist;
      const ny = toY / dist;

      s.dx = lerp(s.dx, nx * pull, dt * 5.2);
      s.dy = lerp(s.dy, ny * pull, dt * 5.2);

      if (dist < CONFIG.gatherSnapRadius) {
        const snapT = 1 - dist / CONFIG.gatherSnapRadius;
        const snap = snapT * snapT;
        s.x = lerp(s.x, targetX, snap * 0.22);
        s.y = lerp(s.y, targetY, snap * 0.22);
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
     Sector 16. Shards / Draw
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
     Sector 17. Compression Flash
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
     Sector 18. Brand / Reveal Logo
     ---------------------------------------------------------
     役割:
     - revealLogo は落下させない
     - 文字位置にそのまま出す
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
    revealLogo.style.transform = "translate(-50%, -50%)";
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
      revealLogo.style.transform = "translate(-50%, -50%)";
    }
  }

  function showRevealLogo() {
    if (!revealLogo) return;
    revealLogo.style.display = "block";
    revealLogo.style.visibility = "visible";
  }

  /* =========================================================
     Sector 19. Gate
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
     Sector 20. Render
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

      const rawLogoK = clamp((t - T_FLASH) / P.logo, 0, 1);
      const logoK = clamp((rawLogoK - 0.18) / 0.82, 0, 1);
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
     Sector 21. Start / Trigger
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
     Sector 22. Boot / Resize / Events
  ========================================================= */
  function rebuildIdleWorld() {
    if (started) return;
    prepareLogos();
    resize();
    buildLogoTargetPoints();
    createShardField();
    initWaterDroplets();
  }

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

    rebuildIdleWorld();

    if (motionQuery.matches) {
      setBrandOpacity(1);
      setRevealOpacity(0);
    }

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(render);
  }

  window.addEventListener("resize", rebuildIdleWorld, { passive: true });
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