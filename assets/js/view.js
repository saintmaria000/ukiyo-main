// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const about = document.getElementById('about');
  let aboutTop = 0;

  // ======================================
  //  ビュー切り替え（left / center / right）
  // ======================================
  function setView(view) {
    document.body.classList.remove('view-left', 'view-center', 'view-right');
    document.body.classList.add('view-' + view);

    // Home (center) に戻るときはスクロールもトップへ
    if (view === 'center') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // data-view を持つボタンで左右切り替え
  const navButtons = document.querySelectorAll('[data-view]');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (!v) return;
      setView(v);
    });
  });

  // data-scroll-target を持つボタンで下方向スクロール（About など）
  const scrollButtons = document.querySelectorAll('[data-scroll-target]');
  scrollButtons.forEach((btn) => {
    const targetSelector = btn.dataset.scrollTarget;
    if (!targetSelector) return;

    btn.addEventListener('click', () => {
      const targetEl = document.querySelector(targetSelector);
      if (!targetEl) return;
      targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 初期状態：中央ビュー
  setView('center');
});