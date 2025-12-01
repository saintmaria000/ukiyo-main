// ../assets/js/background.js
document.addEventListener('DOMContentLoaded', () => {
  const body  = document.body;
  const about = document.getElementById('about');

  console.log('[bg] DOMContentLoaded');

  if (!about) {
    console.log('[bg] #about が見つからない');
    return;
  }

  // 最初は黒
  body.classList.add('bg-main');
  console.log('[bg] 初期クラス:', body.className);

  function updateBackground() {
    const rect = about.getBoundingClientRect();
    const trigger = window.innerHeight * 0.90; // 画面下から 5%

    // デバッグ用に位置を出しておく
    console.log('[bg] rect.top:', rect.top, ' trigger:', trigger);

    if (rect.top < trigger) {
      // About 付近 → グレー
      body.classList.remove('bg-main');
      body.classList.add('bg-about');
      console.log('[bg] => bg-about');
    } else {
      // それ以外 → 黒
      body.classList.remove('bg-about');
      body.classList.add('bg-main');
      console.log('[bg] => bg-main');
    }
  }

  // 監視開始
  window.addEventListener('scroll', updateBackground);
  window.addEventListener('resize', updateBackground);

  // 初回実行
  updateBackground();
});