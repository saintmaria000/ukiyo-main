// assets/js/stage.scale.js
(() => {
  const STAGE_W = 2400;
  const STAGE_H = 1080;

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

  function readNumberVar(style, name, fallback) {
    const raw = style.getPropertyValue(name).trim();
    const num = parseFloat(raw);
    return Number.isFinite(num) ? num : fallback;
  }

  function updateMobileVideoMetrics({ w, h, scale }) {
    const root = document.documentElement;
    const rootStyle = root.style;
    const computed = getComputedStyle(root);

    const isCoarse = window.matchMedia("(pointer:coarse)").matches;

    // PCやfine pointer環境は既存値のまま
    if (!isCoarse) {
      rootStyle.setProperty("--video-mobile-stage-w", "960px");
      rootStyle.setProperty("--video-mobile-stage-offset-y", "0px");
      return;
    }

    const isPortrait = h >= w;

    const ratio = isPortrait
      ? readNumberVar(computed, "--video-mobile-portrait-visible-ratio", 0.92)
      : readNumberVar(computed, "--video-mobile-landscape-visible-ratio", 0.78);

    const maxVisible = isPortrait
      ? readNumberVar(computed, "--video-mobile-portrait-visible-max", 760)
      : readNumberVar(computed, "--video-mobile-landscape-visible-max", 980);

    const visibleOffsetY = isPortrait
      ? readNumberVar(computed, "--video-mobile-portrait-visible-offset-y", 72)
      : readNumberVar(computed, "--video-mobile-landscape-visible-offset-y", 0);

    const safe = readNumberVar(computed, "--video-side-safe", 24);

    // 実際に画面上で見せたい幅
    const visibleWidth = Math.max(
      0,
      Math.min(w * ratio, Math.max(0, w - safe), maxVisible)
    );

    // stage全体にscaleがかかるので、内部widthへ逆算
    const stageWidth = scale > 0 ? (visibleWidth / scale) : 960;
    const stageOffsetY = scale > 0 ? (visibleOffsetY / scale) : 0;

    rootStyle.setProperty("--video-mobile-stage-w", `${stageWidth}px`);
    rootStyle.setProperty("--video-mobile-stage-offset-y", `${stageOffsetY}px`);
  }

  function updateStageMetrics() {
    const { w, h, top, left } = readVV();

    let scale = Math.min(w / STAGE_W, h / STAGE_H);
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;

    const root = document.documentElement.style;
    root.setProperty("--stage-scale", String(scale));
    root.setProperty("--vvw", `${w}px`);
    root.setProperty("--vvh", `${h}px`);
    root.setProperty("--vv-top", `${top}px`);
    root.setProperty("--vv-left", `${left}px`);

    updateMobileVideoMetrics({ w, h, scale });

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