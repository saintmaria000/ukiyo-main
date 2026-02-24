// assets/js/modal.bind.js
document.addEventListener('DOMContentLoaded', () => {
  const WORKS = window.WORKS || {};
  const items = document.querySelectorAll('.gallery-item');

  // WORKSが空＝works.jsが読めてない（パス/ファイル名/キャッシュ）
  if (!Object.keys(WORKS).length) {
    console.warn('[modal.bind] WORKS is empty. Check ../assets/js/works.js path & filename.');
  }

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const id = (item.dataset.id || '').trim();
      const work = WORKS[id];

      if (!id) {
        console.warn('[modal.bind] data-id missing:', item);
        return;
      }

      if (!work) {
        console.warn('[modal.bind] Work not found:', id, 'available:', Object.keys(WORKS));
        return;
      }

      if (!window.GalleryModal?.open) {
        console.warn('[modal.bind] GalleryModal.open not ready. Check modal.ui.js load.');
        return;
      }

      window.GalleryModal.open({
        title: work.title,
        video: work.video,
        credits: work.credits
      });
    });
  });
});
