function smoothScrollToX(container, targetX, duration = 1200, easing = "easeOutExpo") {
  const startX = container.scrollLeft;
  const distance = targetX - startX;
  let startTime = null;

  const easingFunctions = {
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -15 * t)),
    easeInOutCubic: (t) =>
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(1 - (t - 0.5) * 2, 4) / 2,
  };

  function animationStep(currentTime) {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easingFunctions[easing](progress);
    container.scrollLeft = startX + distance * easedProgress;
    if (timeElapsed < duration) requestAnimationFrame(animationStep);
  }

  requestAnimationFrame(animationStep);
}

document.querySelectorAll('a[href^="#"], a[href^="."]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const href = link.getAttribute("href");
    const container = document.querySelector(".main-body");
    if (!container) return;

    const target = document.querySelector(href);
    if (!target) return;

    const containerRect = container.getBoundingClientRect();
    let targetX = target.offsetLeft - (containerRect.left - container.scrollLeft);

    const minX = 0;
    const maxX = container.scrollWidth - container.clientWidth;
    targetX = Math.min(maxX, Math.max(minX, targetX));

    const dist = Math.abs(targetX - container.scrollLeft);
    const baseDuration = 1500;
    const animDuration = Math.min(4000, Math.max(1200, dist * 0.8 + baseDuration));

    // ✅ 強制的に「少しだけ動かす」ように調整
    // → 左端 (#about) に戻る時も1px右に動かして発火
    const adjustedTargetX =
      dist < 3
        ? (targetX === 0 ? 1 : targetX - 1)
        : targetX;

    console.log({
      name: href,
      offsetLeft: target.offsetLeft,
      scrollLeft: container.scrollLeft,
      targetX,
      adjustedTargetX,
      dist,
    });

    smoothScrollToX(container, adjustedTargetX, animDuration, "easeOutExpo");
  });
});