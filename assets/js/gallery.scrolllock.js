(function () {
  const body = document.body;
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  function isSideView() {
    return (
      body.classList.contains('view-left') ||
      body.classList.contains('view-right')
    );
  }

  function shouldLockPageScroll() {
    return mq.matches && isSideView();
  }

  function updateStageScrollLock() {
    body.classList.toggle('is-stage-scroll-lock', shouldLockPageScroll());
  }

  window.addEventListener('resize', updateStageScrollLock);
  window.addEventListener('orientationchange', updateStageScrollLock);

  if (mq.addEventListener) {
    mq.addEventListener('change', updateStageScrollLock);
  } else if (mq.addListener) {
    mq.addListener(updateStageScrollLock);
  }

  const observer = new MutationObserver(() => {
    updateStageScrollLock();
  });

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  updateStageScrollLock();
})();