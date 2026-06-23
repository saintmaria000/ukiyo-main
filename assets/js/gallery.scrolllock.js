(function () {
  const body = document.body;
  const galleryPanel = document.querySelector('.view.view-left .gallery-panel');
  const galleryScroll = document.querySelector('.view.view-left .gallery-scroll');

  const mqCoarse = window.matchMedia('(pointer: coarse)');

  let touchState = null;
  let hintRaf = 0;

  function isAboutArea() {
    return window.scrollY > 20;
  }

  function updateGalleryContinueHint() {
    if (!galleryPanel || !galleryScroll) return;

    const max = maxGalleryScrollTop();
    const hasMoreBelow = max > 2 && galleryScroll.scrollTop < max - 2;

    galleryPanel.classList.toggle('has-more-below', hasMoreBelow);
  }

  function requestGalleryHintUpdate() {
    if (hintRaf) return;

    hintRaf = requestAnimationFrame(() => {
      hintRaf = 0;
      updateGalleryContinueHint();
    });
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

  window.addEventListener('resize', requestGalleryHintUpdate);
  window.addEventListener('orientationchange', requestGalleryHintUpdate);

  if (galleryScroll) {
    galleryScroll.addEventListener('touchstart', onGalleryTouchStart, { passive: true });
    galleryScroll.addEventListener('touchmove', onGalleryTouchMove, { passive: false });
    galleryScroll.addEventListener('touchend', onGalleryTouchEnd, { passive: true });
    galleryScroll.addEventListener('touchcancel', onGalleryTouchEnd, { passive: true });
    galleryScroll.addEventListener('scroll', requestGalleryHintUpdate, { passive: true });
  }

  if (galleryPanel) {
    galleryPanel.addEventListener('galleryloopready', requestGalleryHintUpdate);
  }

  body.classList.remove('is-stage-scroll-lock');
  requestGalleryHintUpdate();
})();
