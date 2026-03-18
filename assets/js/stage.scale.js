// assets/js/stage.scale.js
(() => {
  "use strict";

  const root = document.documentElement;
  if (!root) return;

  const BASE_W = 2400;
  const BASE_H = 1080;

  let rafId = 0;

  function updateStageScale() {
    rafId = 0;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scaleX = width / BASE_W;
    const scaleY = height / BASE_H;
    const scale = Math.min(scaleX, scaleY);

    root.style.setProperty("--vvw", `${width}px`);
    root.style.setProperty("--vvh", `${height}px`);
    root.style.setProperty("--vv-left", "0px");
    root.style.setProperty("--vv-top", "0px");

    root.style.setProperty("--stage-panel-w", `${BASE_W}px`);
    root.style.setProperty("--stage-panel-h", `${BASE_H}px`);
    root.style.setProperty("--stage-scale", `${scale}`);
  }

  function requestUpdate() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateStageScale);
  }

  window.addEventListener("resize", requestUpdate, { passive: true });
  window.addEventListener("orientationchange", requestUpdate, { passive: true });
  window.addEventListener("pageshow", requestUpdate, { passive: true });

  requestUpdate();
})();