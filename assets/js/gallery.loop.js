document.addEventListener("DOMContentLoaded", () => {
  const panel =
    document.querySelector(".view.view-left .gallery-panel") ||
    document.querySelector(".view.view-left .gallery-scroll");

  const content =
    document.querySelector(".view.view-left .gallery-scroll") ||
    panel;

  if (!panel || !content) return;

  let built = false;
  let originals = [];
  let segmentHeight = 0;
  let isNormalizing = false;

  function isMobileLandscape() {
    return window.innerWidth <= 900 && window.innerWidth > window.innerHeight;
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
    return clone;
  }

  function measureSegmentHeight() {
    originals = getOriginalItems();
    segmentHeight = originals.reduce((sum, item) => sum + item.offsetHeight, 0);
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
  }

  function jumpToMiddle() {
    if (!segmentHeight) return;
    panel.scrollTop = segmentHeight;
  }

  function normalizeScrollPosition() {
    if (!built || !segmentHeight || isNormalizing) return;

    const upperBound = segmentHeight * 0.5;
    const lowerBound = segmentHeight * 1.5;

    if (panel.scrollTop < upperBound) {
      isNormalizing = true;
      panel.scrollTop += segmentHeight;
      isNormalizing = false;
    } else if (panel.scrollTop > lowerBound) {
      isNormalizing = true;
      panel.scrollTop -= segmentHeight;
      isNormalizing = false;
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
    normalizeScrollPosition();
  }

  function handleResize() {
    if (isMobileLandscape()) {
      if (!built) {
        buildLoop();
      } else {
        requestAnimationFrame(() => {
          measureSegmentHeight();
          normalizeScrollPosition();
          dispatchLoopReady();
        });
      }
    } else {
      destroyLoop();
    }
  }

  panel.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if (isMobileLandscape()) {
    buildLoop();
  }
});