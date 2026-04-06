document.addEventListener("DOMContentLoaded", () => {
  const panel =
    document.querySelector(".view.view-left .gallery-panel") ||
    document.querySelector(".view.view-left .gallery-scroll");

  const content =
    document.querySelector(".view.view-left .gallery-scroll") ||
    panel;

  if (!panel || !content) return;

  const mq = window.matchMedia("(pointer: coarse)");

  let built = false;
  let segmentHeight = 0;
  let isNormalizing = false;
  let raf = 0;

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

  function buildLoop() {
    if (!isTouchDevice() || built) return;

    const originals = getOriginalItems();
    if (!originals.length) return;

    const top = document.createDocumentFragment();
    const bottom = document.createDocumentFragment();

    originals.forEach((i) => top.appendChild(cloneItem(i)));
    originals.forEach((i) => bottom.appendChild(cloneItem(i)));

    content.prepend(top);
    content.appendChild(bottom);

    built = true;

    requestAnimationFrame(() => {
      measure();
      jumpToMiddle();
      dispatchReady();
    });
  }

  function measure() {
    segmentHeight = content.scrollHeight / 3;
  }

  function jumpToMiddle() {
    if (!segmentHeight) return;
    panel.scrollTop = segmentHeight;
  }

  function normalize() {
    if (!built || !segmentHeight || isNormalizing) return;

    const max = segmentHeight * 2;
    const threshold = 32;
    const top = panel.scrollTop;

    if (top <= threshold) {
      isNormalizing = true;
      panel.scrollTop = top + segmentHeight;
    } else if (top >= max - threshold) {
      isNormalizing = true;
      panel.scrollTop = top - segmentHeight;
    }

    requestAnimationFrame(() => {
      isNormalizing = false;
      dispatchReady();
    });
  }

  function dispatchReady() {
    panel.dispatchEvent(new CustomEvent("galleryloopready"));
  }

  function onScroll() {
    if (!isTouchDevice() || !built) return;
    if (raf) return;

    raf = requestAnimationFrame(() => {
      normalize();
      raf = 0;
    });
  }

  panel.addEventListener("scroll", onScroll, { passive: true });

  if (isTouchDevice()) buildLoop();
});