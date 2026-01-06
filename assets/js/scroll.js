// ==============================
// Floating Scrollbar Toggle
// - Adds "is-scrolling" to <body> while scrolling
// - Removes it shortly after scrolling stops
// ==============================

(() => {
  const CLASS_NAME = "is-scrolling";
  const HIDE_DELAY_MS = 600; // 止まってから消えるまでの時間（好みで 300〜900 くらい）

  let timerId = null;

  const show = () => {
    document.body.classList.add(CLASS_NAME);
  };

  const scheduleHide = () => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      document.body.classList.remove(CLASS_NAME);
      timerId = null;
    }, HIDE_DELAY_MS);
  };

  const onAnyScroll = () => {
    show();
    scheduleHide();
  };

  // ページ全体スクロール
  window.addEventListener("scroll", onAnyScroll, { passive: true });

  // 要素内スクロールも拾いたい場合（あなたの .gallery-scroll 用）
  // 追加したいスクロール要素が増えたら、セレクタを足すだけでOK
  const targets = document.querySelectorAll(".gallery-scroll");
  targets.forEach((el) => {
    el.addEventListener("scroll", onAnyScroll, { passive: true });
  });

  // 初期状態でクラスが残ってたら消す（保険）
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      document.body.classList.remove(CLASS_NAME);
      if (timerId) clearTimeout(timerId);
      timerId = null;
    }
  });
})();