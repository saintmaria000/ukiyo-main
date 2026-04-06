document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".view.view-left .gallery-preview");
  const previewImg = document.querySelector(".view.view-left .gallery-preview-img");

  const panel =
    document.querySelector(".view.view-left .gallery-panel") ||
    document.querySelector(".view.view-left .gallery-scroll");

  const content =
    document.querySelector(".view.view-left .gallery-scroll") ||
    panel;

  const WORKS = window.WORKS || {};
  const mq = window.matchMedia("(pointer: coarse) and (orientation: landscape)");

  if (!preview || !previewImg || !panel || !content) return;

  let ticking = false;
  let currentWorkId = null;
  let items = [];
  let activeIndex = -1;
  let lastScrollTop = 0;
  let panelCenterY = 0;

  function isMobileLandscape() {
    return mq.matches;
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
      `https://i.ytimg.com/vi/${youtubeId}/default.jpg`,
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

        previewImg.onload = () => {
          const width = previewImg.naturalWidth || 0;

          previewImg.onload = null;
          previewImg.onerror = null;

          if (width < MIN_WIDTH) {
            tryNext();
            return;
          }

          resolve(src);
        };

        previewImg.onerror = () => {
          previewImg.onload = null;
          previewImg.onerror = null;
          tryNext();
        };

        if (previewImg.src === src) {
          resolve(src);
          return;
        }

        previewImg.src = src;
      }

      tryNext();
    });
  }

  async function updatePreviewByWorkId(workId) {
    if (!workId) return;

    const work = WORKS[workId];
    if (!work?.video) return;

    const youtubeId = work.youtubeId || getYoutubeId(work.video);
    if (!youtubeId) return;

    if (workId === currentWorkId && previewImg.getAttribute("src")) {
      showPreview();
      return;
    }

    try {
      await loadImageSequential(getThumbnailUrls(youtubeId));
      currentWorkId = workId;
      showPreview();
    } catch {
      if (previewImg.getAttribute("src")) {
        showPreview();
      }
    }
  }

  function collectItems() {
    items = Array.from(
      content.querySelectorAll(".gallery-item:not([data-loop-clone])")
    );
  }

  function clearCenteredState() {
    for (const item of items) {
      item.classList.remove("is-centered");
    }
  }

  function refreshPanelCenter() {
    const rect = panel.getBoundingClientRect();
    panelCenterY = rect.top + rect.height / 2;
  }

  function getItemCenterY(item) {
    const rect = item.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }

  function findClosestIndexFullScan() {
    if (!items.length) return -1;

    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < items.length; i++) {
      const distance = Math.abs(getItemCenterY(items[i]) - panelCenterY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  function findClosestIndexNearActive(scrollDirection) {
    if (!items.length) return -1;
    if (activeIndex < 0 || activeIndex >= items.length) {
      return findClosestIndexFullScan();
    }

    // 今のactive周辺だけを見る
    const candidateIndexes = new Set([
      activeIndex,
      activeIndex - 1,
      activeIndex + 1,
      activeIndex - 2,
      activeIndex + 2,
    ]);

    // スクロール方向に少し寄せる
    if (scrollDirection > 0) {
      candidateIndexes.add(activeIndex + 3);
    } else if (scrollDirection < 0) {
      candidateIndexes.add(activeIndex - 3);
    }

    let closestIndex = activeIndex;
    let closestDistance = Infinity;

    for (const i of candidateIndexes) {
      if (i < 0 || i >= items.length) continue;
      const distance = Math.abs(getItemCenterY(items[i]) - panelCenterY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  function applyActive(index) {
    if (index < 0 || index >= items.length) return;
    if (index === activeIndex) return;

    clearCenteredState();

    const item = items[index];
    item.classList.add("is-centered");
    activeIndex = index;

    const workId = item.dataset.workId || item.getAttribute("data-work-id");
    if (!workId) return;

    updatePreviewByWorkId(workId);
  }

  function updateCenteredPreview() {
    if (!isMobileLandscape()) return;
    if (!items.length) return;

    const scrollTop = panel.scrollTop;
    const direction = scrollTop > lastScrollTop ? 1 : scrollTop < lastScrollTop ? -1 : 0;
    lastScrollTop = scrollTop;

    const nextIndex =
      activeIndex === -1
        ? findClosestIndexFullScan()
        : findClosestIndexNearActive(direction);

    applyActive(nextIndex);
  }

  function requestCenteredPreviewUpdate() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      updateCenteredPreview();
      ticking = false;
    });
  }

  function handleScroll() {
    if (!isMobileLandscape()) return;
    requestCenteredPreviewUpdate();
  }

  function handleResize() {
    collectItems();
    refreshPanelCenter();

    if (!isMobileLandscape()) return;
    requestCenteredPreviewUpdate();
  }

  panel.addEventListener("scroll", handleScroll, { passive: true });
  panel.addEventListener("galleryloopready", () => {
    collectItems();
    refreshPanelCenter();
    requestCenteredPreviewUpdate();
  });

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if (mq.addEventListener) {
    mq.addEventListener("change", handleResize);
  } else if (mq.addListener) {
    mq.addListener(handleResize);
  }

  collectItems();
  refreshPanelCenter();

  if (isMobileLandscape()) {
    requestAnimationFrame(() => {
      requestCenteredPreviewUpdate();
    });
  }
});