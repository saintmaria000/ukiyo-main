// scroll.js（統合・最適化版）
window.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".main-body");
  if (!container) {
    console.error("[scroll.js] .main-body が見つかりません");
    return;
  }

  // --- デバッグ情報 ---
  console.log("[scroll.js] OK?", !!container);
  console.log(
    "scrollWidth:", container.scrollWidth,
    "clientWidth:", container.clientWidth
  );

  // --- スクロール処理 ---
  window.addEventListener("wheel", (e) => {
    // デバッグ出力（必要なければ削除OK）
    console.log("wheel event:", e.deltaX);

    // 縦スクロール入力を横スクロールに変換
    container.scrollLeft += e.deltaX;
  });
});