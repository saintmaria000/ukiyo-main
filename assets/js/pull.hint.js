(function () {
  const body = document.body;
  const topStage = document.getElementById('top');
  let pullHintTimer = null;

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

  // ----------------------------------------
  // About下部のボタンから戻った時に3秒表示
  // ----------------------------------------
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-show-pull="true"]');
    if (!trigger) return;

    setTimeout(() => {
      showPullHint(3000);
    }, 500);
  });

  // ----------------------------------------
  // Stage最上部で下方向に引っぱった時だけ一時表示
  // ----------------------------------------
  let startY = 0;
  let trackingPull = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      const isAtTop = window.scrollY <= 0;
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

      // 下方向に軽く引いたら表示
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

  // スクロールしたら消す
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 8) {
        hidePullHint();
      }
    },
    { passive: true }
  );

  window.showPullHint = showPullHint;
})();