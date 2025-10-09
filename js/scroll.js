// scroll.js
window.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".body");
  if (!container) return;

  // ホイールの縦入力を横スクロールに変換
  window.addEventListener("wheel", (e) => {
    // body に overflow-y:hidden があるため、window で拾う
    if (e.deltaY === 0) return; // 縦入力がない場合は無視
    e.preventDefault();

    // 横方向に移動量を加算
    container.scrollLeft += e.deltaY;
  }, { passive: false });
});