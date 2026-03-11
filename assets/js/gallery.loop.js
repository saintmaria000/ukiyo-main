document.addEventListener("DOMContentLoaded", () => {
  const scroll = document.querySelector(".view.view-left .gallery-scroll");
  const mq = window.matchMedia("(pointer: coarse) and (orientation: landscape)");

  if (!scroll) return;

  let built = false;
  let originals = [];
  let segmentHeight = 0;
  let isNormalizing = false;

  function isMobileLandscape() {
    return mq.matches;
  }

  function getOriginalItems() {
    return Array.from(scroll.querySelectorAll(".gallery-item")).filter(
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

    scroll.prepend(topFrag);
    scroll.appendChild(bottomFrag);

    built = true;

    requestAnimationFrame(() => {
      measureSegmentHeight();
      jumpToMiddle();
      dispatchLoopReady();
    });
  }

  function destroyLoop() {
    if (!built) return;

    scroll.querySelectorAll("[data-loop-clone='true']").forEach((node) => node.remove());

    built = false;
    originals = [];
    segmentHeight = 0;
  }

  function jumpToMiddle() {
    if (!segmentHeight) return;
    scroll.scrollTop = segmentHeight;
  }

  function normalizeScrollPosition() {
    if (!built || !segmentHeight || isNormalizing) return;

    const upperBound = segmentHeight * 0.5;
    const lowerBound = segmentHeight * 1.5;

    if (scroll.scrollTop < upperBound) {
      isNormalizing = true;
      scroll.scrollTop += segmentHeight;
      isNormalizing = false;
    } else if (scroll.scrollTop > lowerBound) {
      isNormalizing = true;
      scroll.scrollTop -= segmentHeight;
      isNormalizing = false;
    }
  }

  function dispatchLoopReady() {
    scroll.dispatchEvent(
      new CustomEvent("galleryloopready", {
        bubbles: true,
        detail: {
          segmentHeight
        }
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

  scroll.addEventListener("scroll", handleScroll, { passive: true });
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