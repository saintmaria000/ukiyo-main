// scroll.js
window.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".body");

  container.addEventListener("wheel", (e) => {
    // 縦スクロール入力を横スクロールに変換
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  });
});