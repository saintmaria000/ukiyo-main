// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  // iOS: ブラウザが勝手にスクロール位置を復元しない
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqLandscape = window.matchMedia('(orientation: landscape)');
  const isMobileLandscape = () => mqCoarse.matches && mqLandscape.matches;

  const updateScale = () => {
    if (typeof window.updateStageScale === 'function') window.updateStageScale();
  };

  const setView = (view) => {
    body.classList.remove('view-left', 'view-center', 'view-right');
    body.classList.add(`view-${view}`);
  };

  const init = () => {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    setView('center');
    updateScale();
  };

  // view 切替
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;

    const v = btn.dataset.view;
    if (!v) return;

    if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

    setView(v);

    // centerに戻るときだけトップへ（任意：不要なら消してOK）
    if (v === 'center') window.scrollTo({ top: 0, behavior: 'smooth' });

    updateScale();
  }, { passive: false });

  // About などへスクロール
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll-target]');
    if (!btn) return;

    const selector = btn.dataset.scrollTarget;
    if (!selector) return;

    const target = document.querySelector(selector);
    if (!target) return;

    if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

    // 横のときはcenterに戻してから（視覚的にも自然）
    if (isMobileLandscape()) setView('center');

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, { passive: false });

  // 回転/リサイズ：スケール更新だけ（スクロールは触らない）
  window.addEventListener('orientationchange', () => setTimeout(updateScale, 120), { passive: true });
  window.addEventListener('resize', updateScale, { passive: true });

  init();
  setTimeout(init, 80); // iOS描画直後のズレを1回だけ補正
});