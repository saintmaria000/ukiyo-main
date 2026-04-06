document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".gallery-preview");
  const previewImg = document.querySelector(".gallery-preview-img");

  const panel =
    document.querySelector(".gallery-panel") ||
    document.querySelector(".gallery-scroll");

  const content =
    document.querySelector(".gallery-scroll") || panel;

  const WORKS = window.WORKS || {};
  const mq = window.matchMedia("(pointer: coarse)");

  if (!preview || !previewImg || !panel || !content) return;

  let ticking = false;
  let currentItem = null;
  let items = [];
  let centerY = 0;
  let cache = new Map();

  function isTouchDevice() {
    return mq.matches;
  }

  function collect() {
    items = Array.from(content.querySelectorAll(".gallery-item"));
  }

  function refreshCenter() {
    const rect = panel.getBoundingClientRect();
    centerY = rect.top + rect.height / 2;
  }

  function getCenter(item) {
    const r = item.getBoundingClientRect();
    return r.top + r.height / 2;
  }

  function getWorkId(el) {
    return (
      el.dataset.workId ||
      el.dataset.originWorkId ||
      el.getAttribute("data-work-id") ||
      el.getAttribute("data-origin-work-id")
    );
  }

  function findClosest(base) {
    if (!items.length) return null;

    if (!base) return fullScan();

    const index = items.indexOf(base);
    if (index === -1) return fullScan();

    let best = base;
    let bestDist = Infinity;

    for (let i = index - 3; i <= index + 3; i++) {
      if (!items[i]) continue;

      const dist = Math.abs(getCenter(items[i]) - centerY);
      if (dist < bestDist) {
        best = items[i];
        bestDist = dist;
      }
    }

    return best;
  }

  function fullScan() {
    let best = null;
    let bestDist = Infinity;

    for (const el of items) {
      const dist = Math.abs(getCenter(el) - centerY);
      if (dist < bestDist) {
        best = el;
        bestDist = dist;
      }
    }

    return best;
  }

  async function updatePreview(workId) {
    if (!workId) return;

    if (cache.has(workId)) {
      previewImg.src = cache.get(workId);
      preview.classList.add("is-visible");
      return;
    }

    const work = WORKS[workId];
    if (!work?.video) return;

    const id = work.video.match(/embed\/([^?]+)/)?.[1];
    if (!id) return;

    const src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    cache.set(workId, src);
    previewImg.src = src;
    preview.classList.add("is-visible");
  }

  function apply(el) {
    if (!el || el === currentItem) return;

    items.forEach((i) => i.classList.remove("is-centered"));
    el.classList.add("is-centered");

    currentItem = el;

    const id = getWorkId(el);
    updatePreview(id);
  }

  function update() {
    if (!isTouchDevice()) return;

    const next = findClosest(currentItem);
    apply(next);
  }

  function requestUpdate() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  panel.addEventListener("scroll", requestUpdate, { passive: true });

  panel.addEventListener("galleryloopready", () => {
    collect();
    refreshCenter();
    requestUpdate();
  });

  collect();
  refreshCenter();
  requestUpdate();
});