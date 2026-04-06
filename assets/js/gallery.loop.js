document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector(".view.view-left .gallery-panel");
  const content = document.querySelector(".view.view-left .gallery-scroll");

  if (!panel || !content) return;

  const scroller = content;
  const mq = window.matchMedia("(pointer: coarse)");

  let built = false;
  let segmentHeight = 0;
  let isNormalizing = false;
  let raf = 0;
  let resizeTimer = null;

  function isTouchDevice() {
    return mq.matches;
  }

  function getOriginalItems() {
    return Array.from(content.querySelectorAll(".gallery-item")).filter(
      (el) => !el.hasAttribute("data-loop-clone")
    );
  }

  function cloneItem(item) {
    const clone = item.cloneNode(true);
    clone.setAttribute("data-loop-clone", "true");
    clone.setAttribute("data-origin-work-id", item.dataset.workId || "");
    clone.setAttribute("aria-hidden", "true");
    return clone;
  }

  function measure() {
    if (!built) return;
    segmentHeight = content.scrollHeight / 3;
  }

  function jumpToMiddle() {
    if (!segmentHeight) return;
    scroller.scrollTop = segmentHeight;
  }

  function dispatchReady() {
    panel.dispatchEvent(
      new CustomEvent("galleryloopready", {
        bubbles: true,
        detail: { segmentHeight }
      })
    );
  }

  function buildLoop() {
    if (!isTouchDevice() || built) return;

    const originals = getOriginalItems();
    if (!originals.length) return;

    const top = document.createDocumentFragment();
    const bottom = document.createDocumentFragment();

    originals.forEach((item) => top.appendChild(cloneItem(item)));
    originals.forEach((item) => bottom.appendChild(cloneItem(item)));

    content.prepend(top);
    content.appendChild(bottom);

    built = true;

    requestAnimationFrame(() => {
      measure();
      jumpToMiddle();
      dispatchReady();
    });
  }

  function destroyLoop() {
    if (!built) return;

    content.querySelectorAll("[data-loop-clone='true']").forEach((node) => {
      node.remove();
    });

    built = false;
    segmentHeight = 0;
    isNormalizing = false;
  }

  function normalize() {
    if (!built || !segmentHeight || isNormalizing) return;

    const max = segmentHeight * 2;
    const threshold = 32;
    const top = scroller.scrollTop;

    if (top <= threshold) {
      isNormalizing = true;
      scroller.scrollTop = top + segmentHeight;
    } else if (top >= max - threshold) {
      isNormalizing = true;
      scroller.scrollTop = top - segmentHeight;
    } else {
      return;
    }

    requestAnimationFrame(() => {
      isNormalizing = false;
      dispatchReady();
    });
  }

  function onScroll() {
    if (!isTouchDevice() || !built) return;
    if (raf) return;

    raf = requestAnimationFrame(() => {
      normalize();
      raf = 0;
    });
  }

  function rebuild() {
    if (!isTouchDevice()) {
      destroyLoop();
      return;
    }

    if (!built) {
      buildLoop();
      return;
    }

    requestAnimationFrame(() => {
      measure();
      jumpToMiddle();
      dispatchReady();
    });
  }

  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      rebuild();
    }, 120);
  }

  scroller.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if (mq.addEventListener) {
    mq.addEventListener("change", handleResize);
  } else if (mq.addListener) {
    mq.addListener(handleResize);
  }

  if (isTouchDevice()) {
    buildLoop();
  }
});