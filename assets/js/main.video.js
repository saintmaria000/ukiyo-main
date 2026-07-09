// assets/js/video.enable.js
(() => {
  const flash = document.querySelector('.video-frame .video-unlock-flash');
  const mainVideo = document.getElementById('mainVideo');

  if (!mainVideo || !flash) return;

  function isModalOpen() {
    const modal = document.getElementById('galleryModal');
    return (
      document.body.classList.contains('is-modal-open') ||
      !!(modal && modal.classList.contains('modal--open'))
    );
  }

  function shouldMuteForAutoplay() {
    return !window.GlobalMute || window.GlobalMute.state !== false;
  }

  function muteForAutoplay(syncGlobalMute = false) {
    if (mainVideo.dataset.prevVol == null && (mainVideo.volume ?? 1) > 0) {
      mainVideo.dataset.prevVol = String(mainVideo.volume ?? 1);
    }

    mainVideo.muted = true;
    mainVideo.defaultMuted = true;
    mainVideo.volume = 0;
    mainVideo.setAttribute('muted', '');

    if (
      syncGlobalMute &&
      window.GlobalMute &&
      window.GlobalMute.state === false &&
      typeof window.GlobalMute.set === 'function'
    ) {
      window.GlobalMute.set(true);
    }
  }

  function syncPlaybackAttributes(forceMuted = false) {
    mainVideo.autoplay = true;
    mainVideo.loop = true;
    mainVideo.playsInline = true;
    mainVideo.preload = 'auto';
    mainVideo.controls = false;
    mainVideo.setAttribute('autoplay', '');
    mainVideo.setAttribute('loop', '');
    mainVideo.setAttribute('playsinline', '');
    mainVideo.setAttribute('webkit-playsinline', '');
    mainVideo.setAttribute('preload', 'auto');
    mainVideo.removeAttribute('controls');

    if (forceMuted || shouldMuteForAutoplay()) {
      muteForAutoplay(false);
    }
  }

  function retryMuted() {
    if (isModalOpen() || document.hidden) return;

    muteForAutoplay(true);

    try {
      const p = mainVideo.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  function playMainVideo(forceMuted = false) {
    if (isModalOpen() || document.hidden) return;

    syncPlaybackAttributes(forceMuted === true);

    try {
      const p = mainVideo.play();

      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          retryMuted();
        });
      }
    } catch (_) {
      retryMuted();
    }
  }

  function playFlash() {
    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
  }

  function playFromInteraction() {
    playFlash();
    playMainVideo(false);
  }

  function schedulePlay(delay = 80) {
    setTimeout(() => playMainVideo(), delay);
  }

  mainVideo.addEventListener('pointerdown', playFromInteraction);

  mainVideo.addEventListener('touchstart', playFromInteraction, {
    passive: true
  });

  syncPlaybackAttributes();
  playMainVideo();
  setTimeout(playMainVideo, 120);
  setTimeout(playMainVideo, 520);
  setTimeout(playMainVideo, 1200);

  window.addEventListener('pageshow', playMainVideo, { passive: true });
  window.addEventListener('focus', playMainVideo, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(playMainVideo, 160), { passive: true });
  window.addEventListener('resize', () => setTimeout(playMainVideo, 80), { passive: true });
  window.addEventListener('touchstart', playMainVideo, { passive: true });
  window.addEventListener('click', playMainVideo, { passive: true });
  window.addEventListener('scroll', playMainVideo, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) playMainVideo();
  });

  mainVideo.addEventListener('loadedmetadata', playMainVideo, { passive: true });
  mainVideo.addEventListener('canplay', playMainVideo, { passive: true });
  mainVideo.addEventListener('ended', () => playMainVideo(true), { passive: true });
  mainVideo.addEventListener('pause', () => schedulePlay(), { passive: true });
})();
