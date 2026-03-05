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
    const el = document.scrollingElement || document.documentElement;
    el.scrollLeft = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo(0, 0);
  }

  // ===============================
  // ✅ mobile-landscape クラス同期
  // （スマホ横：スクロール優先 → 動画タップで操作モード）
  // ===============================
  function syncMobileLandscapeClass() {
    body.classList.toggle('mobile-landscape', isMobileLandscape());

    // 横じゃなくなったら動画操作モード解除（シールド復帰不要）
    if (!isMobileLandscape()) body.classList.remove('video-enabled');
  }

  // ===============================
  // 初期状態の正規化
  // ===============================
  function normalizeInitialState() {
    // ① hash(#contact-right等) は3Dサイトでは不要なので消す
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    // ② viewは必ず center から開始（スマホは特に）
    setView('center', { scrollToTop: false });

    // ③ さらに横scrollを強制リセット（これが “右面から始まる” を止める）
    hardResetScroll();

    // ④ stage scale 更新（あれば）
    if (typeof window.updateStageScale === 'function') window.updateStageScale();

    // ⑤ 横判定クラス更新
    syncMobileLandscapeClass();
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

      // ✅ スクロールは殺さない（hardResetScrollしない）
      if (typeof window.updateStageScale === 'function') window.updateStageScale();
      syncMobileLandscapeClass();
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

        // ✅ スクロール開始を確実に（動画操作モード解除）
        body.classList.remove('video-enabled');
      }

      targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ===============================
  // ① 動画タップで「操作モード」（video-shield 方式）
  // ===============================
  const shield = document.querySelector('.video-shield');
  if (shield) {
    shield.addEventListener('click', () => {
      if (isMobileLandscape()) {
        body.classList.add('video-enabled');
      }
    });
  }

  // ===============================
  // ② 動画の外をタップしたら「スクロール優先」に戻す
  // ===============================
  document.addEventListener('click', (e) => {
    if (!isMobileLandscape()) return;
    if (!body.classList.contains('video-enabled')) return;

    const videoFrame = document.querySelector('.video-frame');
    if (videoFrame && !videoFrame.contains(e.target)) {
      body.classList.remove('video-enabled');
    }
  }, true);

  // ===============================
  // ③ Aboutへ行くボタンを押したら必ず戻す（保険）
  // ===============================
  document.querySelectorAll('[data-scroll-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isMobileLandscape()) body.classList.remove('video-enabled');
    });
  });

  // ===============================
  // 初期化（順序が超重要）
  // ===============================
  normalizeInitialState();

  // iOSは描画後に復元が走ることがあるので“追い打ち”
  // ※多すぎると操作中に当たるので最小限に抑える
  setTimeout(normalizeInitialState, 80);

  // 回転直後も復元が混ざるので遅延してリセット
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      normalizeInitialState();

      // 回転後はcenter固定が一番自然（必要ならここは変更可）
      setView('center', { scrollToTop: false });
      hardResetScroll();
    }, 120);
  });

  // ✅ 重要：resizeで hardResetScroll はしない（スクロール不能の原因になりやすい）
  window.addEventListener('resize', () => {
    if (typeof window.updateStageScale === 'function') window.updateStageScale();
    syncMobileLandscapeClass();
  }, { passive: true });
});