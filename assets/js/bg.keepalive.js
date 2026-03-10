// assets/js/bg.keepalive.js
(() => {
  const bgVideos = document.querySelectorAll('video[data-keep-playing]');
  if (!bgVideos.length) return;

  function ensurePlaying(video) {
    if (!video) return;

    // 背景動画は常に無音・ループ・インライン
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('loop', '');

    try {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch (_) {}
  }

  function ensureAllPlaying() {
    bgVideos.forEach(ensurePlaying);
  }

  // 初回
  document.addEventListener('DOMContentLoaded', ensureAllPlaying);

  // ページ復帰時
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureAllPlaying();
  });

  // スクロールやタップ後にも保険で再確認
  ['touchstart', 'click', 'scroll'].forEach((eventName) => {
    window.addEventListener(
      eventName,
      () => {
        ensureAllPlaying();
      },
      { passive: true }
    );
  });

  // pause されたら即戻す
  bgVideos.forEach((video) => {
    video.addEventListener('pause', () => {
      ensurePlaying(video);
    });

    video.addEventListener('ended', () => {
      ensurePlaying(video);
    });
  });

  // 外から呼びたい時用
  window.BgKeepAlive = {
    playAll: ensureAllPlaying
  };
})();