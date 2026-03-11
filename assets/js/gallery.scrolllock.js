(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.gallery-scroll');
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  if (!galleryScroll) return;

  function updateGalleryScrollLock() {
    body.classList.remove('is-gallery-scroll-lock');
  }

  window.addEventListener('resize', updateGalleryScrollLock);
  window.addEventListener('orientationchange', updateGalleryScrollLock);

  if (mq.addEventListener) {
    mq.addEventListener('change', updateGalleryScrollLock);
  } else if (mq.addListener) {
    mq.addListener(updateGalleryScrollLock);
  }

  updateGalleryScrollLock();
})();