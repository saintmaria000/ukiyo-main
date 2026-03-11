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
          previewImg.src = "";
          requestAnimationFrame(() => {
            previewImg.src = src;
          });
        } else {
          previewImg.src = src;
        }
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

  function getGalleryItems() {
    return Array.from(content.querySelectorAll(".gallery-item"));
  }

  function clearCenteredState() {
    getGalleryItems().forEach((item) => item.classList.remove("is-centered"));
  }

  function getCenteredItem() {
    const items = getGalleryItems();
    if (!items.length) return null;

    const panelRect = panel.getBoundingClientRect();
    const centerY = panelRect.top + panelRect.height / 2;

    let closestItem = null;
    let closestDistance = Infinity;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - itemCenterY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });

    return closestItem;
  }

  function updateCenteredPreview() {
    if (!isMobileLandscape()) return;

    const centered = getCenteredItem();
    if (!centered) return;

    clearCenteredState();
    centered.classList.add("is-centered");

    const workId =
      centered.dataset.workId ||
      centered.dataset.originWorkId ||
      centered.getAttribute("data-work-id") ||
      centered.getAttribute("data-origin-work-id");

    if (!workId) return;

    updatePreviewByWorkId(workId);
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
    if (!isMobileLandscape()) return;
    requestCenteredPreviewUpdate();
  }

  panel.addEventListener("scroll", handleScroll, { passive: true });
  panel.addEventListener("galleryloopready", requestCenteredPreviewUpdate);
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  if (mq.addEventListener) {
    mq.addEventListener("change", handleResize);
  } else if (mq.addListener) {
    mq.addListener(handleResize);
  }

  if (isMobileLandscape()) {
    requestAnimationFrame(() => {
      requestCenteredPreviewUpdate();
    });
  }
});