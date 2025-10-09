// ===========================================
// 横スクロール用ジャンプスクリプト
// ===========================================

function smoothScrollToX(container, targetX, duration = 1500, easing = "easeOutExpo") {
  const startX = container.scrollLeft;
  const distance = targetX - startX;
  let startTime = null;

  const easingFunctions = {
    linear: (t) => t,
    easeInOutCubic: (t) =>
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutExpo: (t) =>
      t === 1 ? 1 : 1 - Math.pow(2, -15 * t),
    easeOutQuad: (t) => t * (2 - t),
  };

  function animationStep(currentTime) {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easingFunctions[easing](progress);
    container.scrollLeft = startX + distance * easedProgress;

    if (timeElapsed < duration) {
      requestAnimationFrame(animationStep);
    }
  }

  requestAnimationFrame(animationStep);
}

// ===========================================
// スクロールリンク（#id と .class 両対応）
// ===========================================
document.querySelectorAll('a[href^="#"], a[href^="."]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const href = link.getAttribute("href");
    const container = document.querySelector(".main-body");
    if (!container) return;

    const target = document.querySelector(href);
    if (!target) return;

    // ✅ targetのX座標を正確に取得（ズレ補正あり）
    // paddingやtransformの影響を受けにくい安定版
    let targetX = container.scrollLeft + (target.getBoundingClientRect().left - container.getBoundingClientRect().left);

    // 範囲外防止
    const minX = 0;
    const maxX = container.scrollWidth - container.clientWidth;
    targetX = Math.min(maxX, Math.max(minX, targetX));

    // 距離とdurationを可変に設定
    const dist = Math.abs(targetX - container.scrollLeft);
    const baseDuration = 1500;
    const animDuration = Math.min(4000, Math.max(1000, dist * 0.6 + baseDuration));

    // ✅ 左端(#about)に戻る時でも必ず動くよう補正
    const adjustedTargetX = dist < 3 ? (targetX === 0 ? 1 : targetX - 1) : targetX;

    console.log({
      name: href,
      offsetLeft: target.offsetLeft,
      scrollLeft: container.scrollLeft,
      targetX,
      adjustedTargetX,
      dist,
    });

    // ✅ 実際のスクロール
    smoothScrollToX(container, adjustedTargetX, animDuration, "easeOutExpo");
  });
});