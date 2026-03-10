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

    if (waitForTopTimer) {
      clearInterval(waitForTopTimer);
      waitForTopTimer = null;
    }

    body.classList.remove('is-pull-hint-visible');
  }

  function isTopReached() {
    return (window.scrollY || window.pageYOffset || 0) <= 4;
  }

  function isCenterView() {
    return body.classList.contains('view-center');
  }

  function waitUntilTopThenShowPull(duration = 3000) {
    if (waitForTopTimer) {
      clearInterval(waitForTopTimer);
    }

    let tries = 0;
    waitForTopTimer = setInterval(() => {
      tries += 1;

      if (isTopReached()) {
        clearInterval(waitForTopTimer);
        waitForTopTimer = null;
        showPullHint(duration);
        return;
      }

      if (tries > 80) {
        clearInterval(waitForTopTimer);
        waitForTopTimer = null;
      }
    }, 50);
  }

  // ----------------------------------------
  // Aboutの「Back to Main」など
  // 明示的に data-show-pull="true" が付いた時だけ Pull を出す
  // ----------------------------------------
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-show-pull="true"]');
    if (!trigger) return;

    waitUntilTopThenShowPull(3000);
  });

  // ----------------------------------------
  // Center view のTOP画面で、上方向に引っぱった時だけ Pull を出す
  // Gallery / Contact では出さない
  // ----------------------------------------
  let startY = 0;
  let trackingPull = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      const isAtTop = isTopReached();
      const isStageArea = topStage && topStage.contains(e.target);

      // Center view 以外では pull tracking しない
      if (!isAtTop || !isStageArea || !isCenterView()) {
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

      // 下方向に引っぱった時だけ表示
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

  // ----------------------------------------
  // スクロールしたら消す
  // ただし「TOPに着いただけ」で勝手には出さない
  // ----------------------------------------
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY || window.pageYOffset || 0;

      if (y > 8) {
        hidePullHint();
      }
    },
    { passive: true }
  );

  // Viewが変わったらPullは消す
  const observer = new MutationObserver(() => {
    hidePullHint();
  });

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  window.showPullHint = showPullHint;
  window.hidePullHint = hidePullHint;
})();