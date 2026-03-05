// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  // iOS Safari のスクロール復元を止める（横位置が勝手に戻るのを防ぐ）
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const mqCoarse = window.matchMedia('(pointer: coarse)');
  const mqLandscape = window.matchMedia('(orientation: landscape)');
  const isMobile = () => mqCoarse.matches;
  const isMobileLandscape = () => mqCoarse.matches && mqLandscape.matches;

  // ===============================
  // view切替
  // ===============================
  function setView(view, options = {}) {
    const { scrollToTop = true } = options;

    body.classList.remove('view-left', 'view-center', 'view-right');
    body.classList.add('view-' + view);

    if (view === 'center' && scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ===============================
  // ✅ iOS対策：hashと横スクロールを強制リセット
  // ===============================
  function hardResetScroll() {
    // 縦横どっちでも、iOSは横scrollLeftを持つことがある
    // なので document/body 両方を叩く
    const el = document.scrollingElement || document.documentElement;
    el.scrollLeft = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    // 縦スクロールも念のため
    window.scrollTo(0, 0);
  }

  function normalizeInitialState() {
    // ① hash(#contact-right等) は3Dサイトでは不要なので消す
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    // ② viewは必ず center から開始（スマホは特に）
    setView('center', { scrollToTop: false });

    // ③ さらに横scrollを強制リセット（これが “右面から始まる” を止める）
    hardResetScroll();
  }

  // ===============================
  // data-view ボタン
  // ===============================
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const v = btn.dataset.view;
      if (!v) return;

      if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

      const noCenterScroll = btn.dataset.noCenterScroll === 'true';

      setView(v, { scrollToTop: !noCenterScroll });

      // スマホはクリック後も横scrollが混ざることがあるのでリセット
      if (isMobile()) hardResetScroll();
    });
  });

  // ===============================
  // data-scroll-target ボタン
  // ===============================
  document.querySelectorAll('[data-scroll-target]').forEach((btn) => {
    const selector = btn.dataset.scrollTarget;
    if (!selector) return;

    btn.addEventListener('click', (e) => {
      const targetEl = document.querySelector(selector);
      if (!targetEl) return;

      if (btn.tagName.toLowerCase() === 'a') e.preventDefault();

      // スマホ横は “centerに戻してから” の方が安定
      if (isMobileLandscape()) {
        setView('center', { scrollToTop: false });
        hardResetScroll();
      }

      targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ===============================
  // 初期化（順序が超重要）
  // ===============================
  normalizeInitialState();

  // iOSは描画後に復元が走ることがあるので“追い打ち”
  setTimeout(normalizeInitialState, 0);
  setTimeout(normalizeInitialState, 80);
  setTimeout(normalizeInitialState, 180);

  // 回転直後も復元が混ざるので遅延してリセット
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      normalizeInitialState();
      // 回転後はcenter固定が一番自然（必要ならここは変更可）
      setView('center', { scrollToTop: false });
      hardResetScroll();
    }, 120);
  });

  window.addEventListener('resize', () => {
    if (isMobile()) hardResetScroll();
  });

  // ===============================
  // iPhone横：iframeタッチ吸収対策
  // ===============================

  function syncMobileLandscapeClass(){
    document.body.classList.toggle('mobile-landscape', isMobileLandscape());
  }

  syncMobileLandscapeClass();

  window.addEventListener('resize', syncMobileLandscapeClass);
  window.addEventListener('orientationchange', () => {
    setTimeout(syncMobileLandscapeClass, 120);
  });
  
});