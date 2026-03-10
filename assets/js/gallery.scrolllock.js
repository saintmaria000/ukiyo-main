(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.gallery-scroll');
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  let scrollYBeforeLock = 0;
  let startY = 0;

  if (!galleryScroll) return;

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

  galleryScroll.addEventListener(
    'touchstart',
    (e) => {
      if (!shouldLockPageScroll()) return;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  galleryScroll.addEventListener(
    'touchmove',
    (e) => {
      if (!shouldLockPageScroll()) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      const scrollTop = galleryScroll.scrollTop;
      const maxScrollTop = galleryScroll.scrollHeight - galleryScroll.clientHeight;

      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop >= maxScrollTop - 1;

      // 指を下に引く = deltaY > 0
      // 指を上に押す = deltaY < 0
      //
      // Galleryの端で外側へ逃げる動きだけ止める
      if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
        e.preventDefault();
      }

      // startY を毎回更新して、慣性中の判定を安定させる
      startY = currentY;
    },
    { passive: false }
  );

  // Gallery外の touchmove は完全に止める
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!shouldLockPageScroll()) return;

      const insideGallery = e.target.closest('.gallery-scroll');
      if (!insideGallery) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  updateGalleryScrollLock();
})();