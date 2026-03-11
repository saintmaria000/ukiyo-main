document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".view.view-left .gallery-preview");
  const previewImg = document.querySelector(".view.view-left .gallery-preview-img");
  const items = document.querySelectorAll(".view.view-left .gallery-item");
  const scroll = document.querySelector(".view.view-left .gallery-scroll");
  const viewLeft = document.querySelector(".view.view-left");
  const WORKS = window.WORKS || {};

  const mobileLandscape = window.matchMedia("(pointer: coarse) and (orientation: landscape)");

  // スマホ横向きではこのファイルは動かさない
  if (mobileLandscape.matches) return;

  // ====== 初期チェック ======
  if (!preview) {
    console.warn("[GalleryPreview] .gallery-preview が見つからない");
    return;
  }

  if (!previewImg) {
    console.warn("[GalleryPreview] .gallery-preview-img が見つからない");
    return;
  }

  if (!items.length) {
    console.warn("[GalleryPreview] .gallery-item が1件も見つからない");
    return;
  }

  if (!Object.keys(WORKS).length) {
    console.warn("[GalleryPreview] window.WORKS が空。works.data.js の読み込み順を確認");
  }

  const DEBUG = true;
  const log = (...args) => DEBUG && console.log(...args);
  const warn = (...args) => DEBUG && console.warn(...args);

  // ====== 表示制御 ======
  function showPreview() {
    preview.classList.add("is-visible");
  }

  function hidePreview() {
    preview.classList.remove("is-visible");
  }

  // ====== YouTube ID抽出 ======
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

  // ====== 利用可能なサムネURL一覧 ======
  function getThumbnailUrls(youtubeId) {
    return [
      `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/default.jpg`,
    ];
  }

  // ====== URLを順番に試して画像読み込み ======
  function loadImageSequential(urls, ctxLabel) {
    return new Promise((resolve, reject) => {
      let index = 0;
      const MIN_WIDTH = 320;

      function tryNext() {
        if (index >= urls.length) {
          reject(new Error("All thumbnail URLs failed"));
          return;
        }

        const src = urls[index++];
        log(`[GalleryPreview] TRY ${ctxLabel}:`, src);

        previewImg.onload = () => {
          const width = previewImg.naturalWidth || 0;
          const height = previewImg.naturalHeight || 0;

          previewImg.onload = null;
          previewImg.onerror = null;

          if (width < MIN_WIDTH) {
            warn(`[GalleryPreview] NG(size) ${ctxLabel}:`, src, `(${width}x${height})`);
            tryNext();
            return;
          }

          log(`[GalleryPreview] OK ${ctxLabel}:`, src, `(${width}x${height})`);
          resolve(src);
        };

        previewImg.onerror = () => {
          previewImg.onload = null;
          previewImg.onerror = null;
          warn(`[GalleryPreview] NG ${ctxLabel}:`, src);
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

  // ====== 作品IDから preview を更新 ======
  async function updatePreviewByWorkId(workId) {
    if (!workId) return;

    const work = WORKS[workId];
    if (!work?.video) {
      warn(`[GalleryPreview] WORKS["${workId}"] が無い / video が無い`);
      hidePreview();
      return;
    }

    const youtubeId = getYoutubeId(work.video);
    if (!youtubeId) {
      warn(`[GalleryPreview] YouTube ID 抽出失敗 id=${workId}`, work.video);
      hidePreview();
      return;
    }

    const urls = getThumbnailUrls(youtubeId);

    log(`[GalleryPreview] HOVER id=${workId} youtubeID=${youtubeId}`);

    try {
      await loadImageSequential(urls, `id=${workId}`);
      showPreview();
    } catch (error) {
      warn(`[GalleryPreview] 全滅 id=${workId} youtubeID=${youtubeId}`, error);
      hidePreview();
    }
  }

  // ====== hover バインド ======
  items.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      const workId = item.dataset.workId;
      updatePreviewByWorkId(workId);
    });
  });

  // ====== 離れたら消す ======
  if (scroll) {
    scroll.addEventListener("mouseleave", hidePreview);
  }

  if (viewLeft) {
    viewLeft.addEventListener("mouseleave", hidePreview);
  }

  log("[GalleryPreview] Ready. items:", items.length);
});