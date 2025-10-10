// js/carousel.js
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".reels").forEach((reelsSection) => {
    // すでにグループ化済みなら二重化しない
    if (reelsSection.querySelector(".reel-group")) return;

    const reels = Array.from(reelsSection.querySelectorAll(".reel"));
    if (reels.length === 0) return;

    // グループを作り、既存の .reel を移動（モーダル等も丸ごと付いてくる）
    const group = document.createElement("div");
    group.className = "reel-group";
    reelsSection.appendChild(group);
    reels.forEach((reel) => group.appendChild(reel));

    // 円周に配置
    const total = reels.length;
    const radius = 700; // CSSの transform-origin のZと合わせる
    reels.forEach((reel, i) => {
      const angle = (360 / total) * i;
      reel.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    });

    // ドラッグで回転（マウス/タッチ両対応）
    let rotationY = 0;
    let dragging = false;
    let startX = 0;
    let velocity = 0;           // 慣性用
    let rafId = null;

    const start = (x) => {
      dragging = true;
      startX = x;
      cancelAnimationFrame(rafId);
      velocity = 0;
    };

    const move = (x) => {
      if (!dragging) return;
      const delta = (x - startX) * 0.35; // 感度
      rotationY += delta;
      velocity = delta; // 最後の移動量を慣性に使う
      group.style.transform = `rotateY(${rotationY}deg)`;
      startX = x;
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      // 慣性（自然に減速）
      const decay = () => {
        velocity *= 0.94; // 減衰
        if (Math.abs(velocity) < 0.2) return;
        rotationY += velocity;
        group.style.transform = `rotateY(${rotationY}deg)`;
        rafId = requestAnimationFrame(decay);
      };
      rafId = requestAnimationFrame(decay);
    };

    // イベント
    reelsSection.addEventListener("mousedown", (e) => start(e.clientX));
    reelsSection.addEventListener("mousemove", (e) => move(e.clientX));
    reelsSection.addEventListener("mouseup", end);
    reelsSection.addEventListener("mouseleave", end);

    reelsSection.addEventListener("touchstart", (e) => start(e.touches[0].clientX), { passive: true });
    reelsSection.addEventListener("touchmove",  (e) => move(e.touches[0].clientX),  { passive: true });
    reelsSection.addEventListener("touchend", end);

    // ホイールでも回す（任意）
    reelsSection.addEventListener("wheel", (e) => {
      rotationY += e.deltaY * 0.25;
      group.style.transform = `rotateY(${rotationY}deg)`;
    }, { passive: true });
  });
});