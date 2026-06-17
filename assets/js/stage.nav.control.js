// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  // iOS: ブラウザが勝手にスクロール位置を復元しない
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqLandscape = window.matchMedia('(orientation: landscape)');

  const isMobileLandscape = () => {
    return mqCoarse.matches && mqLandscape.matches;
  };

  const updateScale = () => {
    if (typeof window.updateStageScale === 'function') {
      window.updateStageScale();
    }
  };

  const setView = (view) => {
    if (!view) return;

    body.classList.remove('view-left', 'view-center', 'view-right');
    body.classList.add(`view-${view}`);
    updateScale();
  };

  // 他JSから使えるように公開
  window.setStageView = setView;

  const scrollToTop = (behavior = 'smooth') => {
    window.scrollTo({
      top: 0,
      behavior
    });
  };

  const waitUntilTop = (callback, maxTries = 80, interval = 50) => {
    let tries = 0;

    const timer = setInterval(() => {
      tries += 1;

      const y = window.scrollY || window.pageYOffset || 0;

      if (y <= 4) {
        clearInterval(timer);
        callback();
        return;
      }

      if (tries >= maxTries) {
        clearInterval(timer);
        callback();
      }
    }, interval);
  };

  const init = () => {
    // 初回だけ hash を消して、必ず center で開始
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    setView('center');
  };

  // ----------------------------------------
  // 1) 通常の左右ビュー切替
  // data-stage-view="left|center|right"
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-stage-view]');
      if (!btn) return;

      const targetView = btn.dataset.stageView;
      if (!targetView) return;

      e.preventDefault();
      setView(targetView);
    },
    { passive: false }
  );

  // ----------------------------------------
  // 2) Aboutなどへの縦移動
  // data-scroll-to="#about"
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-scroll-to]');
      if (!btn) return;

      const selector = btn.dataset.scrollTo;
      if (!selector) return;

      const target = document.querySelector(selector);
      if (!target) return;

      e.preventDefault();

      // 横画面では一度 center に戻してから About へ行く
      if (isMobileLandscape()) {
        setView('center');
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    },
    { passive: false }
  );

  // ----------------------------------------
  // 3) About下部から TOP へ戻って view を切り替える
  // data-stage-jump="center|right"
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-stage-jump]');
      if (!btn) return;

      const targetView = btn.dataset.stageJump;
      if (!targetView) return;

      e.preventDefault();

      scrollToTop('smooth');

      waitUntilTop(() => {
        setView(targetView);
      });
    },
    { passive: false }
  );

  // ----------------------------------------
  // 回転・リサイズ
  // ----------------------------------------
  window.addEventListener(
    'orientationchange',
    () => {
      setTimeout(updateScale, 120);
    },
    { passive: true }
  );

  window.addEventListener('resize', updateScale, { passive: true });

  init();
});
