// assets/js/video.enable.js
(() => {
  const flash = document.querySelector('.video-frame .video-unlock-flash');
  const mainVideo = document.getElementById('mainVideo');

  if (!mainVideo || !flash) return;

  function playFlash() {
    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
  }

  mainVideo.addEventListener('pointerdown', playFlash);

  mainVideo.addEventListener('touchstart', playFlash, {
    passive: true
  });
})();