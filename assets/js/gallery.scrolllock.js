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

  const observer = new MutationObserver(() => {
    updateGalleryScrollLock();
  });

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  window.addEventListener('resize', updateGalleryScrollLock);
  window.addEventListener('orientationchange', updateGalleryScrollLock);

  if (mq.addEventListener) {
    mq.addEventListener('change', updateGalleryScrollLock);
  } else if (mq.addListener) {
    mq.addListener(updateGalleryScrollLock);
  }

  updateGalleryScrollLock();
})();