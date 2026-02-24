document.addEventListener("DOMContentLoaded", () => {
  const preview = document.querySelector(".view.view-left .gallery-preview");
  const previewImg = document.querySelector(".view.view-left .gallery-preview-img");
  const items = document.querySelectorAll(".view.view-left .gallery-item");
  const scroll = document.querySelector(".view.view-left .gallery-scroll");
  const WORKS = window.WORKS || {};

  if (!preview || !previewImg || !items.length) return;

  const getYoutubeId = (url) => {
    const m = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
    return m ? m[1] : null;
  };

  const setThumb = (youtubeID) => {
    const maxres = `https://img.youtube.com/vi/${youtubeID}/maxresdefault.jpg`;
    const hq = `https://img.youtube.com/vi/${youtubeID}/hqdefault.jpg`;

    previewImg.onerror = () => {
      previewImg.onerror = null;
      previewImg.src = hq;
    };

    previewImg.src = maxres;
    preview.classList.add("is-visible");
  };

  const hide = () => preview.classList.remove("is-visible");

  items.forEach(item => {
    item.addEventListener("mouseenter", () => {
      const id = item.dataset.id;
      const work = WORKS[id];
      if (!work?.video) return;

      const youtubeID = getYoutubeId(work.video);
      if (!youtubeID) return;

      setThumb(youtubeID);
    });
  });

  if (scroll) scroll.addEventListener("mouseleave", hide);

  // 画面外れた時も黒に戻す（保険）
  const viewLeft = document.querySelector(".view.view-left");
  if (viewLeft) viewLeft.addEventListener("mouseleave", hide);
});