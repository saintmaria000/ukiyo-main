document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".view.view-left .gallery-preview");
  const previewImg = document.querySelector(".view.view-left .gallery-preview-img");
  const panel = document.querySelector(".view.view-left .gallery-panel");
  const content = document.querySelector(".view.view-left .gallery-scroll");

  const WORKS = window.WORKS || {};
  const mq = window.matchMedia("(pointer: coarse)");

  if (!preview || !previewImg || !panel || !content) return;

  const scroller = content;

  let ticking = false;
  let currentItem = null;
  let currentWorkId = null;
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
      el?.dataset.workId ||
      el?.dataset.originWorkId ||
      el?.getAttribute("data-work-id") ||
      el?.getAttribute("data-origin-work-id") ||
      null
    );
  }

  function showPreview() {
    preview.classList.add("is-visible");
  }

  function getYoutubeId(url) {
    try {
      const u = new URL(String(url || ""), window.location.href);

      if (u.hostname === "youtu.be") {
        const id = u.pathname.replace(/^\//, "").split("/")[0];
        return id || null;
      }

      if (
        u.hostname.includes("youtube.com") ||
        u.hostname.includes("youtube-nocookie.com")
      ) {
        const embedMatch = u.pathname.match(/^\/embed\/([^/?]+)/);
        if (embedMatch) return embedMatch[1];

        const shortsMatch = u.pathname.match(/^\/shorts\/([^/?]+)/);
        if (shortsMatch) return shortsMatch[1];

        if (u.pathname === "/watch") {
          return u.searchParams.get("v");
        }
      }

      const fallback = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
      return fallback ? fallback[1] : null;
    } catch {
      const fallback = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
      return fallback ? fallback[1] : null;
    }
  }

  function getThumbnailUrls(youtubeId) {
    return [
      `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/default.jpg`
    ];
  }

  function loadImageSequential(urls) {
    return new Promise((resolve, reject) => {
      let index = 0;
      const MIN_WIDTH = 320;

      function tryNext() {
        if (index >= urls.length) {
          reject(new Error("All thumbnail URLs failed"));
          return;
        }

        const src = urls[index++];
        const img = new Image();

        img.onload = () => {
          const width = img.naturalWidth || 0;
          if (width < MIN_WIDTH) {
            tryNext();
            return;
          }
          resolve(src);
        };

        img.onerror = () => {
          tryNext();
        };

        img.src = src;
      }

      tryNext();
    });
  }

  async function updatePreview(workId) {
    if (!workId) return;

    if (workId === currentWorkId && previewImg.getAttribute("src")) {
      showPreview();
      return;
    }

    if (cache.has(workId)) {
      previewImg.src = cache.get(workId);
      currentWorkId = workId;
      showPreview();
      return;
    }

    const work = WORKS[workId];
    if (!work?.video) return;

    const youtubeId = work.youtubeId || getYoutubeId(work.video);
    if (!youtubeId) return;

    try {
      const src = await loadImageSequential(getThumbnailUrls(youtubeId));
      cache.set(workId, src);
      previewImg.src = src;
      currentWorkId = workId;
      showPreview();
    } catch {
      if (previewImg.getAttribute("src")) {
        showPreview();
      }
    }
  }

  function fullScan() {
    if (!items.length) return null;

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

  function apply(el) {
    if (!el || el === currentItem) return;

    items.forEach((item) => item.classList.remove("is-centered"));
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

  function handleLoopReady() {
    collect();
    refreshCenter();
    requestUpdate();
  }

  scroller.addEventListener("scroll", requestUpdate, { passive: true });
  panel.addEventListener("galleryloopready", handleLoopReady);

  window.addEventListener("resize", handleLoopReady);
  window.addEventListener("orientationchange", handleLoopReady);

  if (mq.addEventListener) {
    mq.addEventListener("change", handleLoopReady);
  } else if (mq.addListener) {
    mq.addListener(handleLoopReady);
  }

  collect();
  refreshCenter();
  requestUpdate();
});