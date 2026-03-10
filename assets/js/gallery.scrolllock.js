(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.gallery-scroll');
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  if (!galleryScroll) return;

  function isGalleryView() {
    return body.classList.contains('view-left');
  }

  function shouldLockPageScroll() {
    return mq.matches && isGalleryView();
  }

  function updateGalleryScrollLock() {
    body.classList.toggle('is-gallery-scroll-lock', shouldLockPageScroll());
  }

  // ----------------------------------------
  // body class の変化を監視
  // view-left / view-center / view-right の切替に追従
  // ----------------------------------------
  const observer = new MutationObserver(() => {
    updateGalleryScrollLock();
  });

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  // ----------------------------------------
  // リサイズ・回転対応
  // ----------------------------------------
  window.addEventListener('resize', updateGalleryScrollLock);
  window.addEventListener('orientationchange', updateGalleryScrollLock);

  if (mq.addEventListener) {
    mq.addEventListener('change', updateGalleryScrollLock);
  } else if (mq.addListener) {
    mq.addListener(updateGalleryScrollLock);
  }

  // ----------------------------------------
  // Gallery外のタッチ移動を止める
  // Gallery中だけリストスクロール許可
  // ----------------------------------------
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!shouldLockPageScroll()) return;

      const insideGalleryScroll = e.target.closest('.gallery-scroll');

      if (!insideGalleryScroll) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // ----------------------------------------
  // 初期実行
  // ----------------------------------------
  updateGalleryScrollLock();
})();