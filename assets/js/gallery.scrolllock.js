(function () {
  const body = document.body;
  const mqPortrait = window.matchMedia('(pointer: coarse) and (orientation: portrait)');
  const mqLandscape = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  function isSideView() {
    return (
      body.classList.contains('view-left') ||
      body.classList.contains('view-right')
    );
  }

  function isCoarsePortrait() {
    return mqPortrait.matches;
  }

  function isCoarseLandscape() {
    return mqLandscape.matches;
  }

  function shouldLockPageScroll() {
    if (isCoarsePortrait() && isSideView()) return true;
    if (isCoarseLandscape() && isSideView()) return true;
    return false;
  }

  function updateStageScrollLock() {
    body.classList.toggle('is-stage-scroll-lock', shouldLockPageScroll());
  }

  window.addEventListener('resize', updateStageScrollLock);
  window.addEventListener('orientationchange', updateStageScrollLock);

  if (mqPortrait.addEventListener) {
    mqPortrait.addEventListener('change', updateStageScrollLock);
    mqLandscape.addEventListener('change', updateStageScrollLock);
  } else {
    mqPortrait.addListener(updateStageScrollLock);
    mqLandscape.addListener(updateStageScrollLock);
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