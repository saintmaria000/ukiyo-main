// assets/js/modal.bind.js
document.addEventListener('DOMContentLoaded', () => {
  const WORKS = window.WORKS || {};
  const items = document.querySelectorAll('.gallery-item');

  // WORKSが空＝works.jsが読めてない（パス/ファイル名/キャッシュ）
  if (!Object.keys(WORKS).length) {
    console.warn('[modal.bind] WORKS is empty. Check ../assets/js/works.data.js path & filename.');
  }

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const id = (item.dataset.workId || '').trim();
      const work = WORKS[id];

      if (!id) {
        console.warn('[modal.bind] data-work-id missing:', item);
        return;
      }

      if (!work) {
        console.warn('[modal.bind] Work not found:', id, 'available:', Object.keys(WORKS));
        return;
      }

      if (!window.GalleryModal?.open) {
        console.warn('[modal.bind] GalleryModal.open not ready. Check modal.js load.');
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