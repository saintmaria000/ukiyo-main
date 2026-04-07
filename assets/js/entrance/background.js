// assets/js/entrance/background.js

import { CONFIG } from "./config.js";
import { hexToRgb, clamp, lerp, easeOutCubic } from "./utils.js";
import { getWaterBounds } from "./layout.js";
import {
  drawWaterDropletSystem,
  getMainMorph,
  getAuxMorph,
  buildDropletPathAt
} from "./water.js";
import { getGlowFocusPoint } from "./logo.js";

export function drawBackground(dom, runtime, time, phase, t) {
  const { ctx } = dom;
  const { viewport } = runtime;

  ctx.clearRect(0, 0, viewport.w, viewport.h);
  ctx.fillStyle = CONFIG.bg;
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  drawWaterAreaBackground(dom, runtime);
  drawHalo(dom, runtime, time, phase, t);
  drawHorizon(dom, runtime, time);
  drawWater(dom, runtime, time);
}

export function drawWaterAreaBackground(dom, runtime) {
  const { ctx } = dom;
  const { viewport } = runtime;
  const bounds = getWaterBounds(runtime);
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
    viewport.cx,
    viewport.cy,
    Math.min(bounds.width, bounds.height) * 0.18,
    viewport.cx,
    viewport.cy,
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

export function drawHalo(dom, runtime, time, phase, t) {
  const { ctx } = dom;
  const { viewport } = runtime;
  const H = CONFIG.water.halo;
  const pulse = 0.93 + Math.sin(time * 1.1) * 0.03;
  const r = Math.max(viewport.w, viewport.h) * H.radiusRatio * pulse;
  const focus = getGlowFocusPoint(dom, runtime, phase, t);

  const g = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, r);
  g.addColorStop(0, `rgba(255,255,255,${H.alphaCore})`);
  g.addColorStop(0.33, `rgba(255,255,255,${H.alphaMid})`);
  g.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(focus.x, focus.y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHorizon(dom, runtime, time) {
  const { ctx } = dom;
  const { viewport } = runtime;

  const lineW = viewport.w * 0.44;
  const amp = 0.8;
  const yBase = viewport.horizonY;

  const g = ctx.createLinearGradient(
    viewport.cx - lineW * 0.5,
    0,
    viewport.cx + lineW * 0.5,
    0
  );
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.18, "rgba(255,255,255,0.028)");
  g.addColorStop(0.5, "rgba(255,255,255,0.075)");
  g.addColorStop(0.82, "rgba(255,255,255,0.028)");
  g.addColorStop(1, "rgba(255,255,255,0)");

  ctx.save();
  ctx.strokeStyle = g;
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const x = viewport.cx - lineW * 0.5 + (lineW * i) / 80;
    const y = yBase + Math.sin(time * 0.9 + i * 0.18) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawWater(dom, runtime, time) {
  const hintK = runtime.anim.started ? 0 : 0;
  drawWaterDropletSystem(dom, runtime, time, hintK);
}

export function drawReflection(dom, runtime, time, hintK) {
  const { ctx } = dom;
  const { state, viewport } = runtime;
  const R = CONFIG.water.reflection;

  const yMirror = viewport.horizonY + (viewport.cy - viewport.horizonY) * 1.05;
  const squashMain = R.squashMain;
  const squashAux = R.squashAux;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const main = getMainMorph(runtime, time, hintK);
  ctx.save();
  ctx.translate(viewport.cx, yMirror + (viewport.cy - viewport.horizonY) * 0.12);
  ctx.scale(1, squashMain);

  const body = ctx.createRadialGradient(
    -18,
    10,
    3,
    0,
    8,
    main.r * 1.15
  );
  body.addColorStop(0, `rgba(255,255,255,${R.mainBodyAlpha})`);
  body.addColorStop(0.45, "rgba(255,255,255,0.045)");
  body.addColorStop(1, "rgba(255,255,255,0)");

  const pts = buildDropletPathAt(0, 0, main, time, 0, null);

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 2; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  ctx.quadraticCurveTo(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y);
  ctx.closePath();

  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${R.strokeAlphaMain})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  for (const d of state.water.auxDroplets) {
    const m = getAuxMorph(d, time);
    ctx.save();
    ctx.translate(d.x, yMirror + (d.y - viewport.horizonY) * 0.12);
    ctx.scale(1, squashAux);

    const g = ctx.createRadialGradient(
      -m.r * 0.18,
      8,
      1,
      0,
      8,
      m.r * 1.15
    );
    g.addColorStop(0, `rgba(255,255,255,${R.auxBodyAlphaMul * d.alpha})`);
    g.addColorStop(0.55, "rgba(255,255,255,0.02)");
    g.addColorStop(1, "rgba(255,255,255,0)");

    const pts2 = buildDropletPathAt(0, 0, m, time, d.seed, null);

    ctx.beginPath();
    ctx.moveTo(pts2[0].x, pts2[0].y);
    for (let i = 1; i < pts2.length - 2; i++) {
      const xc = (pts2[i].x + pts2[i + 1].x) / 2;
      const yc = (pts2[i].y + pts2[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts2[i].x, pts2[i].y, xc, yc);
    }
    ctx.quadraticCurveTo(pts2[pts2.length - 1].x, pts2[pts2.length - 1].y, pts2[0].x, pts2[0].y);
    ctx.closePath();

    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${R.strokeAlphaAux * d.alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawCompressionFlash(dom, runtime, phase, t) {
  const { ctx } = dom;
  const { state } = runtime;

  if (state.flash <= 0.001) return;

  const k = state.flash;
  const coreR = lerp(2, 20, k);
  const ringR = lerp(4, 84, k);
  const focus = getGlowFocusPoint(dom, runtime, phase, t);

  const g = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, ringR);
  g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
  g.addColorStop(0.15, `rgba(255,255,255,${0.7 * k})`);
  g.addColorStop(0.45, `rgba(255,255,255,${0.18 * k})`);
  g.addColorStop(1, "rgba(255,255,255,0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(focus.x, focus.y, ringR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(focus.x, focus.y, coreR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.95 * k})`;
  ctx.fill();
  ctx.restore();
}