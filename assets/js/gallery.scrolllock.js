(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.gallery-scroll');
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  let scrollYBeforeLock = 0;

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
      'touchmove',
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );
  }

  updateGalleryScrollLock();
})();