// scroll.js
window.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".body");
  if (!container) return;

  window.addEventListener("wheel", (e) => {
    // 縦スクロール入力（deltaY）を横方向に変換
    container.scrollLeft += e.deltaY;
  });
});


window.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".body");
  console.log("scroll.js OK?", !!container);

  window.addEventListener("wheel", (e) => {
    console.log("wheel event:", e.deltaY);
  });

  console.log("scrollWidth:", container.scrollWidth, "clientWidth:", container.clientWidth);
});