// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  // iOS: ブラウザが勝手にスクロール位置を復元しない
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqLandscape = window.matchMedia('(orientation: landscape)');

  const isMobileLandscape = () => mqCoarse.matches && mqLandscape.matches;

  const updateScale = () => {
    if (typeof window.updateStageScale === 'function') {
      window.updateStageScale();
    }
  };

  const setView = (view) => {
    body.classList.remove('view-left', 'view-center', 'view-right');
    body.classList.add(`view-${view}`);
    updateScale();
  };

  // 他JSから使えるように公開
  window.setStageView = setView;

  const init = () => {
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    setView('center');
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

  // ----------------------------------------
  // 1) 通常の view 切替
  // data-view="left|center|right"
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;

      const v = btn.dataset.view;
      if (!v) return;

      e.preventDefault();

      setView(v);

      // centerに戻るときだけトップへ
      if (v === 'center') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    { passive: false }
  );

  // ----------------------------------------
  // 2) About などへ縦スクロール
  // data-scroll-target="#about"
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-scroll-target]');
      if (!btn) return;

      const selector = btn.dataset.scrollTarget;
      if (!selector) return;

      const target = document.querySelector(selector);
      if (!target) return;

      e.preventDefault();

      // 横のときはcenterに戻してから
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
  // 3) About下部からTOPへ戻って view を切り替える
  // data-view-jump="center|right"
  // ----------------------------------------
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('[data-view-jump]');
      if (!btn) return;

      const targetView = btn.dataset.viewJump;
      if (!targetView) return;

      e.preventDefault();

      // まずTOPへ戻る
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      // TOP到達後に view を切り替える
      waitUntilTop(() => {
        setView(targetView);
      });
    },
    { passive: false }
  );

  // 回転/リサイズ：スケール更新だけ
  window.addEventListener(
    'orientationchange',
    () => setTimeout(updateScale, 120),
    { passive: true }
  );

  window.addEventListener('resize', updateScale, { passive: true });

  init();
  setTimeout(init, 80); // iOS描画直後のズレを1回だけ補正
});