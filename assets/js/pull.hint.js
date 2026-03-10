// assets/js/pull.hint.js
(() => {
  const body = document.body;
  const topStage = document.getElementById('top');

  let pullHintTimer = null;
  let waitForTopTimer = null;

  function isTopReached() {
    return (window.scrollY || window.pageYOffset || 0) <= 4;
  }

  function isCenterView() {
    return body.classList.contains('view-center');
  }

  function showPullHint(duration = 3000) {
    body.classList.add('is-pull-hint-visible');

    if (pullHintTimer) {
      clearTimeout(pullHintTimer);
    }

    pullHintTimer = setTimeout(() => {
      body.classList.remove('is-pull-hint-visible');
      pullHintTimer = null;
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

      // 無限待機防止
      if (tries > 80) {
        clearInterval(waitForTopTimer);
        waitForTopTimer = null;
      }
    }, 50);
  }

  // ----------------------------------------
  // 1) About下部の特定ボタンから戻った時だけ Pull を出す
  // 例:
  // <a data-view-jump="center" data-show-pull="true">Back to Main</a>
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const trigger = e.target.closest('[data-show-pull="true"]');
      if (!trigger) return;

      waitUntilTopThenShowPull(3000);
    },
    { passive: true }
  );

  // ----------------------------------------
  // 2) Center view のTOPで上に引っぱった時だけ Pull を出す
  // Gallery / Contact では出さない
  // ----------------------------------------
  let startY = 0;
  let trackingPull = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      const isStageArea = topStage && topStage.contains(e.target);

      if (!isStageArea || !isCenterView() || !isTopReached()) {
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

      // 下方向に少し引いた時だけ見せる
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

  document.addEventListener(
    'touchcancel',
    () => {
      trackingPull = false;
      hidePullHint();
    },
    { passive: true }
  );

  // ----------------------------------------
  // 3) 少しでも下にスクロールしたら消す
  // 「TOPに着いた」だけでは出さない
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

  // ----------------------------------------
  // 4) view が変わったら Pull は消す
  // Gallery / Contact で残らないようにする
  // ----------------------------------------
  const observer = new MutationObserver(() => {
    if (!isCenterView()) {
      hidePullHint();
    }
  });

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  // 外からも使えるようにしておく
  window.PullHint = {
    show: showPullHint,
    hide: hidePullHint
  };
})();