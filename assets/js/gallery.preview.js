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

  // ====== YouTube ID抽出（embed/shorts/watch/youtu.be まで対応）======
  const getYoutubeId = (url) => {
    try {
      const u = new URL(String(url || ""), window.location.href);

      // youtu.be/ID
      if (u.hostname === "youtu.be") {
        const id = u.pathname.replace(/^\//, "").split("/")[0];
        return id || null;
      }

      // youtube.com
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
        // /embed/ID
        const mEmbed = u.pathname.match(/^\/embed\/([^/?]+)/);
        if (mEmbed) return mEmbed[1];

        // /shorts/ID
        const mShorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
        if (mShorts) return mShorts[1];

        // /watch?v=ID
        if (u.pathname === "/watch") return u.searchParams.get("v");
      }

      // 最後の保険（あなたの元のembed正規表現）
      const m = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
      return m ? m[1] : null;
    } catch {
      // URLとして解釈できない場合も保険で
      const m = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
      return m ? m[1] : null;
    }
  };

  // ====== URLを順番に試して、成功したものを採用 ======
  // ※ onload でも「小さいプレースホルダ」が返ることがあるので naturalWidth で弾く
  const loadImageSequential = (urls, ctxLabel) => {
    return new Promise((resolve, reject) => {
      let i = 0;

      // これ未満は「まともなサムネじゃない」扱い（maxres無い時の保険）
      const MIN_W = 320;

      const tryNext = () => {
        if (i >= urls.length) {
          reject(new Error("All thumbnail URLs failed"));
          return;
        }

        const src = urls[i++];
        log(`[GalleryThumb] TRY ${ctxLabel}:`, src);

        previewImg.onload = () => {
          const w = previewImg.naturalWidth || 0;
          const h = previewImg.naturalHeight || 0;

          previewImg.onload = null;
          previewImg.onerror = null;

          // 「存在しない」系の画像（極小/プレースホルダ）を弾く
          if (w < MIN_W) {
            warn(`[GalleryThumb] NG(size) ${ctxLabel}:`, src, `(${w}x${h})`);
            tryNext();
            return;
          }

          log(`[GalleryThumb] OK  ${ctxLabel}:`, src, `(${w}x${h})`);
          resolve(src);
        };

        previewImg.onerror = () => {
          previewImg.onload = null;
          previewImg.onerror = null;
          warn(`[GalleryThumb] NG  ${ctxLabel}:`, src);
          tryNext();
        };

        // 同じURLの再設定でイベントが発火しないことがあるので対策
        if (previewImg.src === src) {
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
      const id = item.dataset.workId;

      if (!id) {
        warn("[GalleryThumb] data-work-id が無い要素がある:", item);
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

      // i.ytimg.com の方が安定しやすい
      const urls = [
        `https://i.ytimg.com/vi/${youtubeID}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${youtubeID}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${youtubeID}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${youtubeID}/mqdefault.jpg`,
        `https://i.ytimg.com/vi/${youtubeID}/default.jpg`,
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