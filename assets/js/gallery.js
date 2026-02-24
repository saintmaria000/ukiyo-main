document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".view.view-left .gallery-preview");
  const previewImg = document.querySelector(".view.view-left .gallery-preview-img");
  const items = document.querySelectorAll(".view.view-left .gallery-item");
  const scroll = document.querySelector(".view.view-left .gallery-scroll");
  const WORKS = window.WORKS || {};

  // ====== 初期チェック ======
  if (!preview) {
    console.warn("[GalleryThumb] .gallery-preview が見つからない");
    return;
  }
  if (!previewImg) {
    console.warn("[GalleryThumb] .gallery-preview-img が見つからない");
    return;
  }
  if (!items.length) {
    console.warn("[GalleryThumb] .gallery-item が1件も見つからない");
    return;
  }
  if (!Object.keys(WORKS).length) {
    console.warn("[GalleryThumb] window.WORKS が空。works.js の読み込み順を確認して");
  }

  const DEBUG = true;
  const log = (...args) => DEBUG && console.log(...args);
  const warn = (...args) => DEBUG && console.warn(...args);

  // ====== YouTube ID抽出 ======
  const getYoutubeId = (url) => {
    const m = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
    return m ? m[1] : null;
  };

  // ====== URLを順番に試して、成功したものを採用 ======
  const loadImageSequential = (urls, ctxLabel) => {
    return new Promise((resolve, reject) => {
      let i = 0;

      const tryNext = () => {
        if (i >= urls.length) {
          reject(new Error("All thumbnail URLs failed"));
          return;
        }

        const src = urls[i++];
        log(`[GalleryThumb] TRY ${ctxLabel}:`, src);

        // 直前のハンドラをクリアしてから設定
        previewImg.onload = () => {
          previewImg.onload = null;
          previewImg.onerror = null;
          log(`[GalleryThumb] OK  ${ctxLabel}:`, src);
          resolve(src);
        };

        previewImg.onerror = (e) => {
          previewImg.onload = null;
          previewImg.onerror = null;
          warn(`[GalleryThumb] NG  ${ctxLabel}:`, src);
          tryNext();
        };

        // 同じURLの再設定でイベントが発火しないことがあるので、少し工夫
        if (previewImg.src === src) {
          // キャッシュ等で発火しない場合に備え、一旦空にしてから入れる
          previewImg.src = "";
          requestAnimationFrame(() => (previewImg.src = src));
        } else {
          previewImg.src = src;
        }
      };

      tryNext();
    });
  };

  // ====== 表示/非表示 ======
  const show = () => preview.classList.add("is-visible");
  const hide = () => preview.classList.remove("is-visible");

  // ====== ホバー処理 ======
  items.forEach((item) => {
    item.addEventListener("mouseenter", async () => {
      const id = item.dataset.id;

      if (!id) {
        warn("[GalleryThumb] data-id が無い要素がある:", item);
        return;
      }

      const work = WORKS[id];
      if (!work?.video) {
        warn(`[GalleryThumb] WORKS["${id}"] が無い / videoが無い`);
        hide();
        return;
      }

      const youtubeID = getYoutubeId(work.video);
      if (!youtubeID) {
        warn(`[GalleryThumb] YouTube ID 抽出失敗 id=${id} video=`, work.video);
        hide();
        return;
      }

      const urls = [
        `https://img.youtube.com/vi/${youtubeID}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${youtubeID}/hqdefault.jpg`,
        `https://img.youtube.com/vi/${youtubeID}/mqdefault.jpg`,
        `https://img.youtube.com/vi/${youtubeID}/default.jpg`,
      ];

      log(`[GalleryThumb] HOVER id=${id} youtubeID=${youtubeID}`);

      try {
        await loadImageSequential(urls, `id=${id}`);
        show();
      } catch (err) {
        warn(`[GalleryThumb] 全滅 id=${id} youtubeID=${youtubeID} → 黒に戻す`, err);
        hide();
      }
    });
  });

  // ====== 離れたら黒に戻す ======
  if (scroll) scroll.addEventListener("mouseleave", hide);

  const viewLeft = document.querySelector(".view.view-left");
  if (viewLeft) viewLeft.addEventListener("mouseleave", hide);

  log("[GalleryThumb] Ready. items:", items.length);
});