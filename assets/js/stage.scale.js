// assets/js/stage.scale.js
(() => {
  "use strict";

  /* =========================================================
     01. Virtual Stage Presets
     - desktop   : PC
     - landscape : tablet / phone landscape
     - portrait  : phone portrait
  ========================================================= */
  const STAGE_PRESETS = {
    desktop: {
      panelW: 2400,
      panelH: 1080,
    },
    landscape: {
      panelW: 1600,
      panelH: 900,
    },
    portrait: {
      panelW: 430,
      panelH: 932,
    },
  };

  /* =========================================================
     02. Viewport Read
  ========================================================= */
  function readViewport() {
    const vv = window.visualViewport;

    if (vv) {
      return {
        width: vv.width,
        height: vv.height,
        top: vv.offsetTop || 0,
        left: vv.offsetLeft || 0,
      };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      top: 0,
      left: 0,
    };
  }

  /* =========================================================
     03. Device State
  ========================================================= */
  function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function isPortrait() {
    return window.matchMedia("(orientation: portrait)").matches;
  }

  function getPreset() {
    if (!isTouchDevice()) return STAGE_PRESETS.desktop;
    return isPortrait() ? STAGE_PRESETS.portrait : STAGE_PRESETS.landscape;
  }

  /* =========================================================
     04. Update
  ========================================================= */
  function updateStageMetrics() {
    const { width, height, top, left } = readViewport();
    const preset = getPreset();

    let scale = Math.min(
      width / preset.panelW,
      height / preset.panelH
    );

    if (!Number.isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    const root = document.documentElement.style;

    root.setProperty("--stage-panel-w", `${preset.panelW}px`);
    root.setProperty("--stage-panel-h", `${preset.panelH}px`);
    root.setProperty("--stage-scale", String(scale));

    root.setProperty("--vvw", `${width}px`);
    root.setProperty("--vvh", `${height}px`);
    root.setProperty("--vv-top", `${top}px`);
    root.setProperty("--vv-left", `${left}px`);

    return scale;
  }

  window.updateStageScale = updateStageMetrics;

  /* =========================================================
     05. Initial
  ========================================================= */
  updateStageMetrics();

  /* =========================================================
     06. Follow-up Updates
  ========================================================= */
  function runDeferredUpdates() {
    updateStageMetrics();
    setTimeout(updateStageMetrics, 60);
    setTimeout(updateStageMetrics, 160);
  }

  window.addEventListener("resize", updateStageMetrics, { passive: true });
  window.addEventListener("orientationchange", runDeferredUpdates, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateStageMetrics, { passive: true });
    window.visualViewport.addEventListener("scroll", updateStageMetrics, { passive: true });
  }
})();