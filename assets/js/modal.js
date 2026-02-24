// videoModal.js（安定版・credit開閉動作修正版）
document.addEventListener("DOMContentLoaded", () => {
  // === ① YouTube埋め込みURL → 高画質プレビュー画像を設定 ===
  document.querySelectorAll(".reel").forEach((reel) => {
    const url = reel.dataset.video;
    if (!url) return;

    const match = url.match(/embed\/([^?]+)/);
    if (match) {
      const id = match[1];
      const preview = reel.querySelector(".preview");
      if (preview) {
        // 高画質サムネイル（maxresdefault）優先
        const maxres = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        const hq = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        preview.src = maxres;
        preview.loading = "lazy";
        preview.decoding = "async";
        preview.onerror = () => (preview.src = hq);
      }
    }
  });

  // === ② プレビュークリック → モーダル表示 ===
  document.querySelectorAll(".preview").forEach((img) => {
    img.addEventListener("click", () => {
      const modal = img.closest(".reel").querySelector(".modal");
      if (!modal) return;
      modal.classList.add("active");
      document.body.style.overflow = "hidden"; // 背景スクロール防止
    });
  });

  // === ③ モーダル背景クリック → 閉じる ===
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = ""; // 背景スクロール解除
      }
    });
  });

  // === ④ CREDITボタン → クレジット展開/閉じる ===
  document.querySelectorAll(".credit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // 背景クリック扱い防止

      const modalContent = btn.closest(".modal-content");
      if (!modalContent) return;

      // 🔹 トグル方式（開く／閉じる）
      modalContent.classList.toggle("active");
    });
  });

  // === ⑤ CREDIT領域クリック → 閉じる ===
  document.querySelectorAll(".credit-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target.classList.contains("credit-overlay")) {
        const modalContent = overlay.closest(".modal-content");
        modalContent?.classList.remove("active");
      }
    });
  });
});