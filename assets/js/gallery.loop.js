document.addEventListener("DOMContentLoaded", () => {
  const panel =
    document.querySelector(".view.view-left .gallery-panel") ||
    document.querySelector(".view.view-left .gallery-scroll");

  const content =
    document.querySelector(".view.view-left .gallery-scroll") ||
    panel;

  if (!panel || !content) return;

  const mq = window.matchMedia("(pointer: coarse) and (orientation: landscape)");

  let built = false;
  let originals = [];
  let segmentHeight = 0;
  let isNormalizing = false;
  let resizeTimer = null;
  let scrollRaf = 0;

  function isMobileLandscape() {
    return mq.matches;
  }

  function getOriginalItems() {
    return Array.from(content.querySelectorAll(".gallery-item")).filter(
      (item) => !item.hasAttribute("data-loop-clone")
    );
  }

  function cloneItem(item) {
    const clone = item.cloneNode(true);
    clone.setAttribute("data-loop-clone", "true");
    clone.setAttribute("data-origin-work-id", item.dataset.workId || "");
    clone.setAttribute("aria-hidden", "true");
    return clone;
  }

  function measureSegmentHeight() {
    const total = content.scrollHeight;
    segmentHeight = total > 0 ? total / 3 : 0;
    originals = getOriginalItems();
  }

  function buildLoop() {
    if (!isMobileLandscape()) return;
    if (built) return;

    originals = getOriginalItems();
    if (!originals.length) return;

    const topFrag = document.createDocumentFragment();
    const bottomFrag = document.createDocumentFragment();

    originals.forEach((item) => topFrag.appendChild(cloneItem(item)));
    originals.forEach((item) => bottomFrag.appendChild(cloneItem(item)));

    content.prepend(topFrag);
    content.appendChild(bottomFrag);

    built = true;

    requestAnimationFrame(() => {
      measureSegmentHeight();
      jumpToMiddle();
      dispatchLoopReady();
    });
  }

  function destroyLoop() {
    if (!built) return;

    content
      .querySelectorAll("[data-loop-clone='true']")
      .forEach((node) => node.remove());

    built = false;
    originals = [];
    segmentHeight = 0;
    isNormalizing = false;
  }

  function jumpToMiddle() {
    if (!segmentHeight) return;
    panel.scrollTop = segmentHeight;
  }

  function normalizeScrollPosition() {
    if (!built || !segmentHeight || isNormalizing) return;

    const max = segmentHeight * 2;
    const threshold = 32;
    const top = panel.scrollTop;

    if (top <= threshold) {
      isNormalizing = true;
      panel.scrollTop = top + segmentHeight;

      requestAnimationFrame(() => {
        isNormalizing = false;
        dispatchLoopReady();
      });
    } else if (top >= max - threshold) {
      isNormalizing = true;
      panel.scrollTop = top - segmentHeight;

      requestAnimationFrame(() => {
        isNormalizing = false;
        dispatchLoopReady();
      });
    }
  }

  function dispatchLoopReady() {
    panel.dispatchEvent(
      new CustomEvent("galleryloopready", {
        bubbles: true,
        detail: { segmentHeight }
      })
    );
  }

  function handleScroll() {
    if (!isMobileLandscape() || !built) return;
    if (scrollRaf) return;

    scrollRaf = requestAnimationFrame(() => {
      normalizeScrollPosition();
      scrollRaf = 0;
    });
  }

  function handleResize() {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      if (isMobileLandscape()) {
        if (!built) buildLoop();

        requestAnimationFrame(() => {
          measureSegmentHeight();
          jumpToMiddle();
          dispatchLoopReady();
        });
      } else {
        destroyLoop();
      }
    }, 120);
  }

  panel.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if (mq.addEventListener) {
    mq.addEventListener("change", handleResize);
  } else if (mq.addListener) {
    mq.addListener(handleResize);
  }

  if (isMobileLandscape()) {
    buildLoop();
  }
});