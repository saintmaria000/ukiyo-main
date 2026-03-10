(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.gallery-scroll');
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  let scrollYBeforeLock = 0;
  let isTouchingGallery = false;

  function isGalleryView() {
    return body.classList.contains('view-left');
  }

  function shouldLockPageScroll() {
    return mq.matches && isGalleryView();
  }

  function lockBodyScroll() {
    if (body.classList.contains('is-gallery-scroll-lock')) return;

    scrollYBeforeLock = window.scrollY || window.pageYOffset || 0;
    body.classList.add('is-gallery-scroll-lock');
    body.style.top = `-${scrollYBeforeLock}px`;
  }

  function unlockBodyScroll() {
    if (!body.classList.contains('is-gallery-scroll-lock')) return;

    body.classList.remove('is-gallery-scroll-lock');
    body.style.top = '';
    window.scrollTo(0, scrollYBeforeLock);
  }

  function updateGalleryScrollLock() {
    if (shouldLockPageScroll()) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
  }

  const observer = new MutationObserver(updateGalleryScrollLock);
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

  if (galleryScroll) {
    galleryScroll.addEventListener(
      'touchstart',
      () => {
        if (!shouldLockPageScroll()) return;
        isTouchingGallery = true;
      },
      { passive: true }
    );

    galleryScroll.addEventListener(
      'touchend',
      () => {
        isTouchingGallery = false;
      },
      { passive: true }
    );

    galleryScroll.addEventListener(
      'touchcancel',
      () => {
        isTouchingGallery = false;
      },
      { passive: true }
    );
  }

  // Gallery外の touchmove は止める
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!shouldLockPageScroll()) return;

      const insideGallery = e.target.closest('.gallery-scroll');

      if (!insideGallery) {
        e.preventDefault();
        return;
      }

      // Gallery内なら通す
    },
    { passive: false }
  );

  updateGalleryScrollLock();
})();