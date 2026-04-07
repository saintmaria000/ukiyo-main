// assets/js/entrance/logo.js

import { CONFIG } from "./config.js";
import { shuffleInPlace, clamp, easeOutCubic, lerp } from "./utils.js";

export function buildLogoTargetPoints(dom, runtime) {
  const { revealLogo } = dom;
  const { state, viewport } = runtime;

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

  const text =
    (revealLogo.textContent || "").replace(/\s+/g, "").trim() ||
    CONFIG.logoMask.fallbackText;

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

  if (!state.logoTargets.length) {
    state.logoTargets.push({ x: viewport.cx, y: viewport.cy });
  }
}

export function getAnyLogoTarget(runtime) {
  const { state, viewport } = runtime;

  if (state.logoTargets.length) {
    return state.logoTargets[(Math.random() * state.logoTargets.length) | 0];
  }

  if (state.logoTargetRect) {
    return {
      x: state.logoTargetRect.left + state.logoTargetRect.width * 0.5,
      y: state.logoTargetRect.top + state.logoTargetRect.height * 0.5
    };
  }

  return { x: viewport.cx, y: viewport.cy };
}

export function assignShardTargets(runtime) {
  const { state } = runtime;

  const pts = state.logoTargets.length
    ? state.logoTargets.slice()
    : [getAnyLogoTarget(runtime)];

  shuffleInPlace(pts);

  for (let i = 0; i < state.shards.length; i++) {
    const p = pts[i % pts.length];
    state.shards[i].targetX = p.x;
    state.shards[i].targetY = p.y;
  }

  for (let i = 0; i < state.inflow.length; i++) {
    const p = pts[(i + state.shards.length) % pts.length];
    state.inflow[i].targetX = p.x;
    state.inflow[i].targetY = p.y;
  }
}

export function setBrandOpacity(dom, opacity) {
  const { brand } = dom;
  if (!brand) return;

  brand.style.opacity = String(clamp(opacity, 0, 1));
  brand.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
}

export function setRevealOpacity(dom, opacity) {
  const { revealLogo } = dom;
  if (!revealLogo) return;

  const k = clamp(opacity, 0, 1);
  revealLogo.style.opacity = String(k);
  revealLogo.style.visibility = k <= 0.001 ? "hidden" : "visible";
  revealLogo.style.transform = "translate(-50%, -50%)";
}

export function prepareLogos(dom) {
  const { brand, revealLogo } = dom;

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

export function showRevealLogo(dom) {
  const { revealLogo } = dom;
  if (!revealLogo) return;

  revealLogo.style.display = "block";
  revealLogo.style.visibility = "visible";
}

export function getLogoCenter(dom, runtime) {
  const { revealLogo } = dom;
  const { state, viewport } = runtime;

  if (state.logoTargetRect) {
    return {
      x: state.logoTargetRect.left + state.logoTargetRect.width * 0.5,
      y: state.logoTargetRect.top + state.logoTargetRect.height * 0.5
    };
  }

  if (!revealLogo) {
    return { x: viewport.cx, y: viewport.cy };
  }

  const prevVisibility = revealLogo.style.visibility;
  const prevOpacity = revealLogo.style.opacity;
  const prevDisplay = revealLogo.style.display;
  const prevTransform = revealLogo.style.transform;

  revealLogo.style.display = "block";
  revealLogo.style.visibility = "hidden";
  revealLogo.style.opacity = "0";
  revealLogo.style.transform = "translate(-50%, -50%)";

  const rect = revealLogo.getBoundingClientRect();

  revealLogo.style.display = prevDisplay;
  revealLogo.style.visibility = prevVisibility;
  revealLogo.style.opacity = prevOpacity;
  revealLogo.style.transform = prevTransform;

  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.5
  };
}

export function getGlowFocusPoint(dom, runtime, phase, t) {
  const { viewport, phaseTimes } = runtime;
  const { T_DRIFT, T_LOGO } = phaseTimes;
  const logo = getLogoCenter(dom, runtime);

  if (phase === "gather" || phase === "flash" || phase === "logo" || phase === "done") {
    const k = clamp((t - T_DRIFT) / Math.max(T_LOGO - T_DRIFT, 0.0001), 0, 1);
    const e = easeOutCubic(k);

    return {
      x: lerp(viewport.cx, logo.x, e),
      y: lerp(viewport.cy - 10, logo.y, e)
    };
  }

  return { x: viewport.cx, y: viewport.cy - 10 };
}