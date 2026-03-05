// assets/js/stage.scale.js
(() => {
  const STAGE_W = 2400;
  const STAGE_H = 1080;

  // iOS Safari のアドレスバー伸縮で innerHeight が揺れるので
  // visualViewport があれば優先して使う
  function getViewportSize() {
    const vv = window.visualViewport;
    if (vv) return { w: vv.width, h: vv.height };
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function updateStageScale() {
    const { w, h } = getViewportSize();

    // scale = min(viewportW/2400, viewportH/1080)
    let scale = Math.min(w / STAGE_W, h / STAGE_H);

    // 念のため0以下を防ぐ
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;

    document.documentElement.style.setProperty("--stage-scale", String(scale));

    // もしステージにwidth/heightを変数で持たせたい場合のために公開
    return scale;
  }

  // view.js から呼べるように公開（任意）
  window.updateStageScale = updateStageScale;

  // 初回
  updateStageScale();

  // resize/回転の追従
  window.addEventListener("resize", updateStageScale, { passive: true });

  window.addEventListener(
    "orientationchange",
    () => {
      // 回転直後は値が安定しないので追い打ち
      updateStageScale();
      setTimeout(updateStageScale, 60);
      setTimeout(updateStageScale, 160);
    },
    { passive: true }
  );

  // アドレスバー伸縮やピンチでも変わる（iOSで有効）
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateStageScale, { passive: true });
    window.visualViewport.addEventListener("scroll", updateStageScale, { passive: true });
  }
})();
