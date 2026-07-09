// assets/js/main.video.js
// メイン動画を「開いたら必ず再生・以後は流しっぱなし」に保つ。
// 音のオン/オフは mute.js（GlobalMute）が管理する。ここは再生専任。
(() => {
  const video = document.getElementById('mainVideo');
  if (!video) return;

  const modal = document.getElementById('galleryModal');

  const isModalOpen = () =>
    document.body.classList.contains('is-modal-open') ||
    !!(modal && modal.classList.contains('modal--open'));

  // GlobalMute が「解除(false)」以外なら、ミュートを維持する
  const shouldMute = () => !window.GlobalMute || window.GlobalMute.state !== false;

  // 自動再生をブラウザに通すためのミュート（元音量は退避しておく）
  function muteForAutoplay() {
    if (video.dataset.prevVol == null && (video.volume ?? 1) > 0) {
      video.dataset.prevVol = String(video.volume ?? 1);
    }
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute('muted', '');

    if (window.GlobalMute && window.GlobalMute.state === false) {
      window.GlobalMute.set(true);
    }
  }

  // 再生に必要な属性を一度だけ整える（再生ボタン等は出さない）
  function setupAttributes() {
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.controls = false;
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.removeAttribute('controls');
  }

  // 再生を試みる。失敗したらミュートに落として必ずもう一度。
  function play() {
    if (isModalOpen() || document.hidden) return;
    if (shouldMute()) muteForAutoplay();

    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        muteForAutoplay();
        const retry = video.play();
        if (retry && typeof retry.catch === 'function') retry.catch(() => {});
      });
    }
  }

  // --- 初期化：開いたら必ず再生 ---
  setupAttributes();
  play();

  // --- 止まっても流し続ける ---
  video.addEventListener('canplay', play, { passive: true });
  video.addEventListener('ended', play, { passive: true });

  // --- タブ/ページ復帰で戻す ---
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
  window.addEventListener('pageshow', play, { passive: true });

  // --- 最初のユーザー操作でブラウザの自動再生ロックを解除（1回だけ） ---
  const unlock = () => play();
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
})();