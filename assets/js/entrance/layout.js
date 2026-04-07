// assets/js/entrance/layout.js

import { CONFIG } from "./config.js";
import { clamp, lerp } from "./utils.js";

export function resize(dom, runtime) {
  const { canvas, ctx } = dom;
  const { viewport } = runtime;

  viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewport.w = window.innerWidth;
  viewport.h = window.innerHeight;

  canvas.width = Math.floor(viewport.w * viewport.dpr);
  canvas.height = Math.floor(viewport.h * viewport.dpr);
  canvas.style.width = `${viewport.w}px`;
  canvas.style.height = `${viewport.h}px`;

  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);

  viewport.cx = viewport.w * CONFIG.water.area.centerXRatio;
  viewport.cy = viewport.h * CONFIG.water.area.centerYRatio + CONFIG.water.area.mainOffsetY;
  viewport.horizonY = viewport.h * lerp(CONFIG.horizonYMin, CONFIG.horizonYMax, 0.5);
}

export function getMainBaseRadius(runtime) {
  const { viewport } = runtime;
  const C = CONFIG.water.main;

  const scaleW = viewport.w / C.responsiveBaseWidth;
  const scaleH = viewport.h / C.responsiveBaseHeight;
  const responsiveScale = (scaleW * 0.58) + (scaleH * 0.42);
  const finalScale = clamp(
    responsiveScale,
    C.viewportMinScale,
    C.viewportMaxScale
  );

  return C.radius * finalScale;
}

export function getWaterBounds(runtime) {
  const { viewport } = runtime;
  const C = CONFIG.water.area;

  const baseMinX = viewport.cx - C.fixedWidth * 0.5;
  const baseMaxX = viewport.cx + C.fixedWidth * 0.5;
  const baseMinY = viewport.cy - C.fixedHeight * 0.5;
  const baseMaxY = viewport.cy + C.fixedHeight * 0.5;

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