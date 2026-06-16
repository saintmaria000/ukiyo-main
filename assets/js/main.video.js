// assets/js/video.enable.js
(() => {
  const body = document.body;
  const mainVideo = document.getElementById('mainVideo');
  const flash = document.querySelector('.video-frame .video-unlock-flash');

  if (!body || !mainVideo) return;

  function ytCommandTo(iframeEl, func) {
    if (!iframeEl || !iframeEl.contentWindow) return;

    try {
      iframeEl.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        '*'
      );
    } catch (_) {}
  }

  function playUnlockEffect() {
    if (!flash) return;

    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
  }

  function enableVideo() {
    body.classList.add('video-enabled');
    playUnlockEffect();

    requestAnimationFrame(() => {
      ytCommandTo(mainVideo, 'playVideo');
    });
  }

  function stopVideo() {
    ytCommandTo(mainVideo, 'pauseVideo');
    body.classList.remove('video-enabled');
  }

  // iframeのクリックを邪魔しない。
  // 画面中央動画はYouTube iframeを直接触らせる。
  mainVideo.addEventListener('pointerdown', () => {
    enableVideo();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopVideo();
    }
  });

  window.MainVideoControl = {
    play: enableVideo,
    stop: stopVideo
  };
})();