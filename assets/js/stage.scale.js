// assets/js/stage.scale.js
(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const spaceWrapper = document.querySelector(".space-wrapper");
  const stage = document.querySelector(".stage");

  if (!root || !body || !spaceWrapper || !stage) return;

  const mqCoarse = window.matchMedia("(pointer: coarse)");
  const mqPortrait = window.matchMedia("(orientation: portrait)");

  let rafId = 0;

  function getVisualMetrics() {
    const vv = window.visualViewport;

    if (vv) {
      return {
        width: Math.round(vv.width),
        height: Math.round(vv.height),
        offsetLeft: Math.round(vv.offsetLeft || 0),
        offsetTop: Math.round(vv.offsetTop || 0),
        pageTop: Math.round(vv.pageTop || 0),
        scale: vv.scale || 1
      };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
      pageTop: 0,
      scale: 1
    };
  }

  function getRootNumberVar(name, fallback) {
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    const num = parseFloat(raw);
    return Number.isFinite(num) ? num : fallback;
  }

  function setViewportVars(metrics) {
    root.style.setProperty("--vvw", `${metrics.width}px`);
    root.style.setProperty("--vvh", `${metrics.height}px`);
    root.style.setProperty("--vv-left", `${metrics.offsetLeft}px`);
    root.style.setProperty("--vv-top", `${metrics.offsetTop}px`);
  }

  function applyCoarseLayout(metrics) {
    setViewportVars(metrics);

    root.style.setProperty("--stage-panel-w", `${metrics.width}px`);
    root.style.setProperty("--stage-panel-h", `${metrics.height}px`);
    root.style.setProperty("--stage-scale", "1");

    body.classList.add("is-coarse-device");
    body.classList.remove("is-fine-device");

    if (mqPortrait.matches) {
      body.classList.add("is-portrait-device");
      body.classList.remove("is-landscape-device");
    } else {
      body.classList.add("is-landscape-device");
      body.classList.remove("is-portrait-device");
    }
  }

  function applyFineLayout(metrics) {
    setViewportVars(metrics);

    const baseW = getRootNumberVar("--stage-base-w", 2400);
    const baseH = getRootNumberVar("--stage-base-h", 1080);

    const scaleX = metrics.width / baseW;
    const scaleY = metrics.height / baseH;
    const stageScale = Math.min(scaleX, scaleY);

    root.style.setProperty("--stage-panel-w", `${baseW}px`);
    root.style.setProperty("--stage-panel-h", `${baseH}px`);
    root.style.setProperty("--stage-scale", `${stageScale}`);

    body.classList.add("is-fine-device");
    body.classList.remove("is-coarse-device");
    body.classList.remove("is-portrait-device");
    body.classList.remove("is-landscape-device");
  }

  function updateStageMetrics() {
    rafId = 0;

    const metrics = getVisualMetrics();

    if (mqCoarse.matches) {
      applyCoarseLayout(metrics);
    } else {
      applyFineLayout(metrics);
    }
  }

  function requestUpdate() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateStageMetrics);
  }

  function bindMediaQuery(mq) {
    if (!mq) return;
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", requestUpdate);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(requestUpdate);
    }
  }

  window.addEventListener("resize", requestUpdate, { passive: true });
  window.addEventListener("orientationchange", requestUpdate, { passive: true });
  window.addEventListener("pageshow", requestUpdate, { passive: true });
  document.addEventListener("visibilitychange", requestUpdate, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", requestUpdate, { passive: true });
    window.visualViewport.addEventListener("scroll", requestUpdate, { passive: true });
  }

  bindMediaQuery(mqCoarse);
  bindMediaQuery(mqPortrait);

  requestUpdate();
})();