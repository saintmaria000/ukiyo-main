// assets/js/pull.hint.js
(() => {
  const body = document.body;

  let hideTimer = null;
  let startY = 0;
  let startX = 0;
  let trackingPull = false;
  let pullFired = false;

  function isCenterView() {
    return body.classList.contains('view-center');
  }

  function isAtTop() {
    return (window.scrollY || window.pageYOffset || 0) <= 6;
  }

  function showPull(duration = 3000) {
    body.classList.add('is-pull-hint-visible');

    if (hideTimer) {
      clearTimeout(hideTimer);
    }

    hideTimer = setTimeout(() => {
      body.classList.remove('is-pull-hint-visible');
      hideTimer = null;
    }, duration);
  }

  function hidePull() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    body.classList.remove('is-pull-hint-visible');
  }

  // ----------------------------------------
  // 1) About の Back to Main から戻った時
  // ----------------------------------------
  function showPullAfterReturn(retries = 14, delay = 120) {
    let count = 0;

    const tick = () => {
      count += 1;

      if (isCenterView() && isAtTop()) {
        showPull(3000);
        return;
      }

      if (count < retries) {
        setTimeout(tick, delay);
      }
    };

    setTimeout(tick, 420);
  }

  document.addEventListener(
    'click',
    (e) => {
      const trigger = e.target.closest('[data-pull-hint]');
      if (!trigger) return;

      showPullAfterReturn();
    },
    { passive: true }
  );

  // ----------------------------------------
  // 2) スマホ実機: TOPでの下方向スワイプ意図を拾う
  // ----------------------------------------
  document.addEventListener(
    'touchstart',
    (e) => {
      if (!isCenterView() || !isAtTop()) {
        trackingPull = false;
        pullFired = false;
        return;
      }

      const t = e.touches[0];
      startY = t.clientY;
      startX = t.clientX;
      trackingPull = true;
      pullFired = false;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!trackingPull || pullFired) return;
      if (!isCenterView() || !isAtTop()) {
        trackingPull = false;
        return;
      }

      const t = e.touches[0];
      const dy = t.clientY - startY;
      const dx = Math.abs(t.clientX - startX);

      if (dy > 18 && dx < 24) {
        showPull(1200);
        pullFired = true;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    () => {
      trackingPull = false;
      pullFired = false;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchcancel',
    () => {
      trackingPull = false;
      pullFired = false;
    },
    { passive: true }
  );

  // ----------------------------------------
  // 3) PC: TOPでさらに上へスクロールしようとした意図を拾う
  // deltaY < 0 = 上へ行こうとしている
  // ----------------------------------------
  let lastWheelTriggerAt = 0;

  window.addEventListener(
    'wheel',
    (e) => {
      if (!isCenterView() || !isAtTop()) return;

      const now = Date.now();
      const isUpIntent = e.deltaY < -6;

      if (!isUpIntent) return;

      // 連続発火しすぎないように少し間引く
      if (now - lastWheelTriggerAt < 700) return;

      lastWheelTriggerAt = now;
      showPull(1200);
    },
    { passive: true }
  );

  // ----------------------------------------
  // 4) TOPから離れたら消す
  // ----------------------------------------
  window.addEventListener(
    'scroll',
    () => {
      if (!isAtTop()) {
        hidePull();
      }
    },
    { passive: true }
  );

  window.PullHint = {
    show: showPull,
    hide: hidePull
  };
})();