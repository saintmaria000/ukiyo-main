// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  // 端末判定（スマホ/タブレットのタッチ系）
  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqLandscape = window.matchMedia('(orientation: landscape)');

  const isMobileLandscape = () => mqCoarse.matches && mqLandscape.matches;

  // ===============================
  // ビュー切り替え: left / center / right
  // ===============================
  function setView(view, options = {}) {
    const { scrollToTop = true } = options;

    body.classList.remove('view-left', 'view-center', 'view-right');
    body.classList.add('view-' + view);

    // center のときだけデフォルトでページ先頭に戻す
    if (view === 'center' && scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ===============================
  // ✅ 起動時ガード
  // スマホ横向きでは「必ずcenter開始」 + hash(#contact-right)を無効化
  // ===============================
  function normalizeInitialState() {
    if (!isMobileLandscape()) return;

    // hash が残っていると初期ジャンプの副作用が出ることがあるので消す
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    // 他JSが後から view-right を付けても戻すため、
    // まずここで確実に center
    setView('center', { scrollToTop: false });
  }

  // ===============================
  // data-view ボタン
  // ===============================
  const navButtons = document.querySelectorAll('[data-view]');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const v = btn.dataset.view;
      if (!v) return;

      if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

      const noCenterScroll = btn.dataset.noCenterScroll === 'true';

      setView(v, {
        scrollToTop: !noCenterScroll,
      });
    });
  });

  // ===============================
  // data-scroll-target ボタン
  // ===============================
  const scrollButtons = document.querySelectorAll('[data-scroll-target]');
  scrollButtons.forEach((btn) => {
    const selector = btn.dataset.scrollTarget;
    if (!selector) return;

    btn.addEventListener('click', (e) => {
      const targetEl = document.querySelector(selector);
      if (!targetEl) return;

      if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

      // スマホ横向きでは “3Dの中心に戻してから Aboutへ” の方が体験が安定
      if (isMobileLandscape()) {
        setView('center', { scrollToTop: false });
      }

      targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ===============================
  // 初期状態：中央ビュー
  // ===============================
  setView('center', { scrollToTop: false });

  // ✅ スマホ横向き：初期化をもう一度かける（他JS/描画遅延対策）
  normalizeInitialState();
  setTimeout(normalizeInitialState, 0);
  setTimeout(normalizeInitialState, 120);

  // 回転/リサイズでも安定させる
  window.addEventListener('orientationchange', () => {
    // 回転直後は値が揺れるので少し遅らせて反映
    setTimeout(normalizeInitialState, 80);
  });

  window.addEventListener('resize', () => {
    // resize は頻繁に来るので軽く
    normalizeInitialState();
  });
});