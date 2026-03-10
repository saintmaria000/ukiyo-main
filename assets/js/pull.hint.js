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
      const trigger = e.target.closest('[data-show-pull="true"]');
      if (!trigger) return;

      showPullAfterReturn();
    },
    { passive: true }
  );

  // ----------------------------------------
  // 2) Center view の TOP での「下方向スワイプ開始」を拾う
  // 実機での overscroll/bounce そのものではなく、
  // “上に何かあると探る意図” をトリガーにする
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

      // 縦方向の下スワイプで、横ブレが少ないときだけ発火
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
  // 3) TOPから離れたら消す
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