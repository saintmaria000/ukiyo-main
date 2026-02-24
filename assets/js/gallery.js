document.addEventListener("DOMContentLoaded", () => {

  const previewImg = document.querySelector(".gallery-preview-img");
  const items = document.querySelectorAll(".gallery-item");
  const WORKS = window.WORKS || {};

  if (!previewImg) return;

  const getYoutubeId = (url) => {
    const match = String(url || "").match(/youtube\.com\/embed\/([^?&/]+)/);
    return match ? match[1] : null;
  };

  items.forEach(item => {
    item.addEventListener("mouseenter", () => {

      const id = item.dataset.id;
      const work = WORKS[id];

      if (!work || !work.video) return;

      const youtubeID = getYoutubeId(work.video);
      if (!youtubeID) return;

      previewImg.src =
        `https://img.youtube.com/vi/${youtubeID}/hqdefault.jpg`;

      previewImg.style.opacity = "1";
    });
  });

});