// assets/js/view.js
document.addEventListener('DOMContentLoaded', () => {
  const body       = document.body;
  const topSection = document.getElementById('top'); // 3D 空間の一番上

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

  // ---------------------------------
  // data-view を持つボタン / リンク
  // 例: <button data-view="left">Gallery</button>
  //     <a data-view="right" ...>Contact</a>
  // ---------------------------------
  const navButtons = document.querySelectorAll('[data-view]');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const v = btn.dataset.view;
      if (!v) return;

      // aタグのデフォルトの #ジャンプは止める
      if (btn.tagName.toLowerCase() === 'a') {
        e.preventDefault();
      }

      // data-no-center-scroll が付いている場合、
      // center に戻ってもスクロール位置は維持
      const noCenterScroll = btn.dataset.noCenterScroll === 'true';

      setView(v, {
        scrollToTop: !noCenterScroll,
      });
    });
  });

  // ---------------------------------
  // data-scroll-target を持つボタン / リンク
  // 例: <button data-scroll-target="#about">About</button>
  //     <a data-scroll-target="#top" ...>Contact</a>
  // ---------------------------------
  const scrollButtons = document.querySelectorAll('[data-scroll-target]');
  scrollButtons.forEach((btn) => {
    const selector = btn.dataset.scrollTarget;
    if (!selector) return;

    btn.addEventListener('click', (e) => {
      const targetEl = document.querySelector(selector);
      if (!targetEl) return;

      // aタグのデフォルトの #ジャンプは止める
      if (btn.tagName.toLowerCase() === 'a') {
        e.preventDefault();
      }

      targetEl.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 初期状態：中央ビュー
  setView('center', { scrollToTop: false });
});