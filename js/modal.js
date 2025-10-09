// modal.js（統合版）
document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 0) ユーティリティ
  // =========================
  const getYouTubeId = (url) => {
    if (!url) return null;
    // /embed/XXXX, ?v=XXXX, youtu.be/XXXX などに対応
    const m =
      url.match(/embed\/([^?&#/]+)/) ||
      url.match(/[?&]v=([^?&#/]+)/) ||
      url.match(/youtu\.be\/([^?&#/]+)/);
    return m ? m[1] : null;
  };

  // =========================
  // 1) プレビュー画像を高画質で自動設定
  // =========================
  document.querySelectorAll(".reel").forEach((reel) => {
    const url = reel.dataset.video;
    const id = getYouTubeId(url);
    const img = reel.querySelector(".preview");
    if (!img || !id) return;

    // まず maxres、ダメなら hq にフォールバック
    const maxres = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    const hq = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

    img.loading = "lazy";
    img.decoding = "async";
    img.src = maxres;
    img.onerror = () => (img.src = hq);
  });

  // =========================
  // 2) モーダル開閉 & 再生/停止
  // =========================
  const openModal = (modal) => {
    if (!modal) return;
    // 再生（autoplay=1を付与／既にあればそのまま）
    const iframe = modal.querySelector("iframe");
    if (iframe) {
      const src = iframe.getAttribute("src") || "";
      iframe.dataset.srcOriginal = src; // 退避
      if (!/[?&]autoplay=1/.test(src)) {
        const joiner = src.includes("?") ? "&" : "?";
        iframe.src = src + joiner + "autoplay=1";
      }
    }
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeModal = (modal) => {
    if (!modal) return;
    // 停止（srcを元に戻す→再読み込みを止める）
    const iframe = modal.querySelector("iframe");
    if (iframe && iframe.dataset.srcOriginal) {
      iframe.src = iframe.dataset.srcOriginal;
    }
    modal.classList.remove("active");
    // クレジット開いてたら閉じる
    const credit = modal.querySelector(".credit-overlay");
    if (credit) credit.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  // プレビュークリック→モーダル表示
  document.querySelectorAll(".preview").forEach((img) => {
    img.addEventListener("click", () => {
      const modal = img.closest(".reel")?.querySelector(".modal");
      openModal(modal);
    });
  });

  // モーダルの背景クリック→閉じる（中身クリックは閉じない）
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // ESCキーで閉じる
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.active").forEach(closeModal);
    }
  });

  // =========================
  // 3) クレジット開閉（同じ場所クリックで閉じる）
  // =========================
  document.querySelectorAll(".credit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // 背景クリック扱いにしない
      const modal = btn.closest(".modal");
      const overlay = modal?.querySelector(".credit-overlay");
      if (!overlay) return;
      overlay.classList.toggle("is-open");
    });
  });

  // クレジット領域クリックで閉じる
  document.querySelectorAll(".credit-overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => {
      // コンテンツ領域クリックは閉じない
      if (e.target.classList.contains("credit-overlay")) {
        ov.classList.remove("is-open");
      }
    });
  });
});