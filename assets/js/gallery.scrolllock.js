(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.view.view-left .gallery-scroll');

  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqPortrait = window.matchMedia('(pointer: coarse) and (orientation: portrait)');
  const mqLandscape = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  let touchState = null;

  function isSideView() {
    return (
      body.classList.contains('view-left') ||
      body.classList.contains('view-right')
    );
  }

  function isTouchStage() {
    return mqPortrait.matches || mqLandscape.matches;
  }

  function isAboutArea() {
    return window.scrollY > 20;
  }

  function shouldLockPageScroll() {
    if (isAboutArea()) return false;
    return isTouchStage() && isSideView();
  }

  function updateStageScrollLock() {
    body.classList.toggle('is-stage-scroll-lock', shouldLockPageScroll());
  }

  function shouldHandleGalleryTouch(target) {
    return !!(
      galleryScroll &&
      mqCoarse.matches &&
      body.classList.contains('view-left') &&
      !isAboutArea() &&
      galleryScroll.contains(target)
    );
  }

  function maxGalleryScrollTop() {
    if (!galleryScroll) return 0;
    return Math.max(0, galleryScroll.scrollHeight - galleryScroll.clientHeight);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function onGalleryTouchStart(e) {
    if (!e.touches || !e.touches.length || !shouldHandleGalleryTouch(e.target)) {
      touchState = null;
      return;
    }

    const touch = e.touches[0];

    touchState = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTop: galleryScroll.scrollTop
    };
  }

  function onGalleryTouchMove(e) {
    if (!touchState || !e.touches || !e.touches.length || !shouldHandleGalleryTouch(e.target)) {
      return;
    }

    const touch = e.touches[0];
    const dx = touch.clientX - touchState.startX;
    const dy = touch.clientY - touchState.startY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) return;

    galleryScroll.scrollTop = clamp(
      touchState.startTop - dy,
      0,
      maxGalleryScrollTop()
    );

    e.preventDefault();
    e.stopPropagation();
  }

  function onGalleryTouchEnd() {
    touchState = null;
  }

  window.addEventListener('resize', updateStageScrollLock);
  window.addEventListener('orientationchange', updateStageScrollLock);
  window.addEventListener('scroll', updateStageScrollLock, { passive: true });

  [mqCoarse, mqPortrait, mqLandscape].forEach((mq) => {
    if (mq.addEventListener) {
      mq.addEventListener('change', updateStageScrollLock);
    } else {
      mq.addListener(updateStageScrollLock);
    }
  });

  if (galleryScroll) {
    galleryScroll.addEventListener('touchstart', onGalleryTouchStart, { passive: true });
    galleryScroll.addEventListener('touchmove', onGalleryTouchMove, { passive: false });
    galleryScroll.addEventListener('touchend', onGalleryTouchEnd, { passive: true });
    galleryScroll.addEventListener('touchcancel', onGalleryTouchEnd, { passive: true });
  }

  const observer = new MutationObserver(updateStageScrollLock);

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  updateStageScrollLock();
})();