(function () {
  const body = document.body;
  let pullHintTimer = null;

  function showPullHint(duration = 3000) {
    body.classList.add('is-pull-hint-visible');

    if (pullHintTimer) {
      clearTimeout(pullHintTimer);
    }

    pullHintTimer = setTimeout(() => {
      body.classList.remove('is-pull-hint-visible');
    }, duration);
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-show-pull="true"]');
    if (!trigger) return;

    // #top に戻るスクロール後に少し遅れて表示
    setTimeout(() => {
      showPullHint(3000);
    }, 500);
  });

  // 必要なら他JSからも呼べるようにする
  window.showPullHint = showPullHint;
})();