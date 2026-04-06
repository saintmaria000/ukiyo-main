document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector(".view.view-left .gallery-panel");
  const content = document.querySelector(".view.view-left .gallery-scroll");

  if (!panel || !content) return;

  let built = false;
  let originals = [];
  let segmentHeight = 0;
  let currentScroller = null;
  let ticking = false;
  let resizeTimer = null;
  let isJumping = false;

  function isCoarse() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function getScroller() {
    return isCoarse() ? panel : content;
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

  function buildLoop() {
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

  function measureSegmentHeight() {
    originals = getOriginalItems();
    if (!originals.length) return;

    // 3ブロック構成（clone + original + clone）なのでこちらの方がズレに強い
    segmentHeight = content.scrollHeight / 3;
  }

  function jumpToMiddle(force = false) {
    const scroller = getScroller();
    if (!scroller || !segmentHeight) return;

    isJumping = true;
    scroller.scrollTop = segmentHeight;

    if (force) {
      requestAnimationFrame(() => {
        isJumping = false;
      });
    } else {
      setTimeout(() => {
        isJumping = false;
      }, 30);
    }
  }

  function normalizeScrollPosition() {
    if (!built || !segmentHeight || isJumping || !currentScroller) return;

    const scroller = currentScroller;
    const max = segmentHeight * 2;

    // 端ギリギリまで行った時だけ補正する
    const threshold = Math.max(48, segmentHeight * 0.12);

    if (scroller.scrollTop <= threshold) {
      isJumping = true;
      scroller.scrollTop += segmentHeight;
      requestAnimationFrame(() => {
        isJumping = false;
      });
      return;
    }

    if (scroller.scrollTop >= max - threshold) {
      isJumping = true;
      scroller.scrollTop -= segmentHeight;
      requestAnimationFrame(() => {
        isJumping = false;
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

  function onScroll() {
    if (!built || ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      normalizeScrollPosition();
      ticking = false;
    });
  }

  function bindScroller() {
    const nextScroller = getScroller();

    if (currentScroller === nextScroller) return;

    if (currentScroller) {
      currentScroller.removeEventListener("scroll", onScroll);
    }

    currentScroller = nextScroller;
    currentScroller.addEventListener("scroll", onScroll, { passive: true });
  }

  function rebuild() {
    if (!built) buildLoop();
    bindScroller();

    requestAnimationFrame(() => {
      measureSegmentHeight();
      jumpToMiddle(true);
      dispatchLoopReady();
    });
  }

  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      rebuild();
    }, 180);
  }

  content.addEventListener("click", (e) => {
    const clone = e.target.closest("[data-loop-clone='true']");
    if (!clone) return;

    const workId = clone.getAttribute("data-origin-work-id");
    if (!workId) return;

    const original = content.querySelector(
      `.gallery-item[data-work-id="${workId}"]:not([data-loop-clone])`
    );

    if (!original) return;

    e.preventDefault();
    original.click();
  });

  buildLoop();
  bindScroller();
  rebuild();

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);
});