function smoothScrollToX(container, targetX, duration = 2800, easing = "easeOutExop") {
  const startX = container.scrollLeft;
  const distance = targetX - startX;
  let startTime = null;

  const easingFunctions = {
    linear: (t) => t,
    easeInOutCubic: (t) => t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeOutQuad: (t) => t * (2 - t),
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

document.querySelectorAll('a[href^="."], a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const href = link.getAttribute("href");
    const container = document.querySelector(".main-body");

    // hrefが「.」で始まるならクラス、「#」ならID
    const target =
      href.startsWith(".")
        ? document.querySelector(href)
        : document.querySelector(href.replace("#", "#"));

    if (target && container) {
      const containerRect = container.getBoundingClientRect();
      const targetX = target.offsetLeft - (containerRect.left - container.scrollLeft);
      smoothScrollToX(container, targetX, 1200, "easeOutExpo");
    }
  });
});