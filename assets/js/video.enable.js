// assets/js/video.enable.js
(() => {
  const body = document.body;
  const mainShield = document.querySelector('.video-frame .video-shield');
  const mainVideo = document.getElementById('mainVideo');
  const flash = document.querySelector('.video-frame .video-unlock-flash');

  if (!body || !mainShield || !mainVideo) return;

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

  function isEnabled() {
    return body.classList.contains('video-enabled');
  }

  function enableAndPlay() {
    body.classList.add('video-enabled');
    playUnlockEffect();

    requestAnimationFrame(() => {
      ytCommandTo(mainVideo, 'playVideo');
    });
  }

  function lockAndStop() {
    ytCommandTo(mainVideo, 'stopVideo');
    ytCommandTo(mainVideo, 'pauseVideo');
    body.classList.remove('video-enabled');
  }

  function toggleMainVideo() {
    if (isEnabled()) {
      lockAndStop();
    } else {
      enableAndPlay();
    }
  }

  mainShield.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMainVideo();
  });

  // ナビ押下時は自動で止めて戻す
  document.addEventListener('click', (e) => {
    const target = e.target;

    if (target.closest('.edge-btn') && isEnabled()) {
      lockAndStop();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEnabled()) {
      lockAndStop();
    }
  });

  window.MainVideoControl = {
    play: enableAndPlay,
    stop: lockAndStop,
    toggle: toggleMainVideo
  };
})();