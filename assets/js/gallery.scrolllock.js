(function () {
  const body = document.body;

  const mqLandscape = window.matchMedia('(pointer: coarse) and (orientation: landscape)');
  const mqPortrait  = window.matchMedia('(pointer: coarse) and (orientation: portrait)');

  function isSideView() {
    return (
      body.classList.contains('view-left') ||
      body.classList.contains('view-right')
    );
  }

  function isPortraitMobile() {
    return mqPortrait.matches;
  }

  function isLandscapeMobile() {
    return mqLandscape.matches;
  }

  function shouldLockPageScroll() {
    /* --- 縦スマホ：常にロック --- */
    if (isPortraitMobile()) {
      return true;
    }

    /* --- 横スマホ：サイド時のみロック --- */
    if (isLandscapeMobile() && isSideView()) {
      return true;
    }

    return false;
  }

  function forceCenterOnPortrait() {
    if (!isPortraitMobile()) return;

    /* サイドにいたら強制的にセンターへ戻す */
    if (isSideView()) {
      body.classList.remove('view-left', 'view-right');
      body.classList.add('view-center');
    }
  }

  function updateStageScrollLock() {
    forceCenterOnPortrait();
    body.classList.toggle('is-stage-scroll-lock', shouldLockPageScroll());
  }

  window.addEventListener('resize', updateStageScrollLock);
  window.addEventListener('orientationchange', updateStageScrollLock);

  if (mqLandscape.addEventListener) {
    mqLandscape.addEventListener('change', updateStageScrollLock);
    mqPortrait.addEventListener('change', updateStageScrollLock);
  } else {
    mqLandscape.addListener(updateStageScrollLock);
    mqPortrait.addListener(updateStageScrollLock);
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