// assets/js/stage.scale.js
(() => {
  const STAGE_W = 2400;
  const STAGE_H = 1080;
  const COARSE_POINTER = "(pointer:coarse)";

  function readVV() {
    const vv = window.visualViewport;
    if (vv) {
      return {
        w: vv.width,
        h: vv.height,
        top: vv.offsetTop || 0,
        left: vv.offsetLeft || 0,
      };
    }

    return {
      w: window.innerWidth,
      h: window.innerHeight,
      top: 0,
      left: 0,
    };
  }

  function isTouchStage() {
    return window.matchMedia(COARSE_POINTER).matches;
  }

  function readStageScale(w, h) {
    if (isTouchStage()) return 1;

    const scale = Math.min(w / STAGE_W, h / STAGE_H);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  function updateStageMetrics() {
    const { w, h, top, left } = readVV();
    const root = document.documentElement.style;
    const scale = readStageScale(w, h);

    root.setProperty("--stage-scale", String(scale));
    root.setProperty("--vvw", `${w}px`);
    root.setProperty("--vvh", `${h}px`);
    root.setProperty("--vv-top", `${top}px`);
    root.setProperty("--vv-left", `${left}px`);

    return scale;
  }

  window.updateStageScale = updateStageMetrics;

  updateStageMetrics();

  const onLater = () => {
    updateStageMetrics();
    setTimeout(updateStageMetrics, 60);
    setTimeout(updateStageMetrics, 160);
  };

  window.addEventListener("resize", updateStageMetrics, { passive: true });
  window.addEventListener("orientationchange", onLater, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateStageMetrics, { passive: true });
    window.visualViewport.addEventListener("scroll", updateStageMetrics, { passive: true });
  }
})();
