// assets/js/video.enable.js
(() => {
  const flash = document.querySelector('.video-frame .video-unlock-flash');
  const mainVideo = document.getElementById('mainVideo');

  if (!mainVideo || !flash) return;

  function isModalOpen() {
    return document.body.classList.contains('is-modal-open');
  }

  function syncPlaybackAttributes() {
    mainVideo.autoplay = true;
    mainVideo.loop = true;
    mainVideo.playsInline = true;
    mainVideo.setAttribute('autoplay', '');
    mainVideo.setAttribute('loop', '');
    mainVideo.setAttribute('playsinline', '');
  }

  function playMainVideo() {
    if (isModalOpen()) return;

    syncPlaybackAttributes();

    try {
      const p = mainVideo.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (isModalOpen()) return;
          if (window.GlobalMute && window.GlobalMute.state === false) return;

          mainVideo.muted = true;
          mainVideo.defaultMuted = true;
          mainVideo.setAttribute('muted', '');

          try {
            const retry = mainVideo.play();
            if (retry && typeof retry.catch === 'function') retry.catch(() => {});
          } catch (_) {}
        });
      }
    } catch (_) {}
  }

  function playFlash() {
    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
  }

  mainVideo.addEventListener('pointerdown', playFlash);

  mainVideo.addEventListener('touchstart', playFlash, {
    passive: true
  });

  syncPlaybackAttributes();
  playMainVideo();
  setTimeout(playMainVideo, 120);
  setTimeout(playMainVideo, 520);

  window.addEventListener('pageshow', playMainVideo, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(playMainVideo, 160), { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) playMainVideo();
  });
})();
