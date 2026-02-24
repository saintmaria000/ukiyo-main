// js/3dtest.js
document.addEventListener('DOMContentLoaded', () => {
  const stage = document.querySelector('.reel-group');
  // 少し傾けて3D空間を確認
  stage.style.transform = 'rotateY(-15deg) rotateX(3deg)';

  // ← → キーでY回転を試す
  let y = -15;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') y -= 5;
    if (e.key === 'ArrowLeft')  y += 5;
    stage.style.transform = `rotateY(${y}deg) rotateX(3deg)`;
  });
});