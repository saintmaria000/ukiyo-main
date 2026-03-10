(function () {
  const body = document.body;
  const topStage = document.getElementById('top');
  let pullHintTimer = null;
  let waitForTopTimer = null;

  function showPullHint(duration = 3000) {
    body.classList.add('is-pull-hint-visible');

    if (pullHintTimer) {
      clearTimeout(pullHintTimer);
    }

    pullHintTimer = setTimeout(() => {
      body.classList.remove('is-pull-hint-visible');
    }, duration);
  }

  function hidePullHint() {
    if (pullHintTimer) {
      clearTimeout(pullHintTimer);
      pullHintTimer = null;
    }
    body.classList.remove('is-pull-hint-visible');
  }

  function waitUntilTopThenShowPull(duration = 3000) {
    if (waitForTopTimer) {
      clearInterval(waitForTopTimer);
    }

    let tries = 0;
    waitForTopTimer = setInterval(() => {
      tries += 1;

      const y = window.scrollY || window.pageYOffset || 0;
      if (y <= 4) {
        clearInterval(waitForTopTimer);
        waitForTopTimer = null;
        showPullHint(duration);
      }

      if (tries > 60) {
        clearInterval(waitForTopTimer);
        waitForTopTimer = null;
      }
    }, 50);
  }

  // About下部のボタンから戻った時だけ、TOP到達後に pull を出す
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-show-pull="true"]');
    if (!trigger) return;

    waitUntilTopThenShowPull(3000);
  });

  // Stage最上部で下方向に引っぱった時だけ一時表示
  let startY = 0;
  let trackingPull = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      const isAtTop = (window.scrollY || window.pageYOffset || 0) <= 0;
      const isStageArea = topStage && topStage.contains(e.target);

      if (!isAtTop || !isStageArea) {
        trackingPull = false;
        return;
      }

      trackingPull = true;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!trackingPull) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 26) {
        body.classList.add('is-pull-hint-visible');
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    () => {
      if (!trackingPull) return;
      trackingPull = false;

      showPullHint(1200);
    },
    { passive: true }
  );

  window.addEventListener(
    'scroll',
    () => {
      if ((window.scrollY || window.pageYOffset || 0) > 8) {
        hidePullHint();
      }
    },
    { passive: true }
  );

  window.showPullHint = showPullHint;
})();