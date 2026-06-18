// assets/js/modal.ui.js
(function () {
  const modal      = document.getElementById('galleryModal');
  if (!modal) return;

  const modalVideo = document.getElementById('modalVideo');
  const mainVideo  = document.getElementById('mainVideo');
  const closeEls   = document.querySelectorAll('[data-modal-close]');

  const creditOverlay = document.getElementById('modalCredit');
  const creditToggle  = document.getElementById('creditToggleBtn');
  const creditTitle   = document.getElementById('modalCreditTitle');
  const creditListEl  = document.getElementById('modalCreditList');

  let lastActiveEl = null;
  let lastScrollY = 0;
  let mainVideoWasMuted = true;
  let mainVideoWasVolume = 1;
  let globalMuteWasMuted = null;

  // =========================
  // YouTube URL補完
  // =========================
  function withEnableJsApi(url) {
    if (!url) return '';
    try {
      const u = new URL(url, window.location.href);
      const isYouTube =
        /(^|\.)youtube\.com$/.test(u.hostname) ||
        /(^|\.)youtube-nocookie\.com$/.test(u.hostname);

      if (isYouTube && !u.searchParams.has('enablejsapi')) {
        u.searchParams.set('enablejsapi', '1');
      }
      return u.toString();
    } catch {
      return url;
    }
  }

  // =========================
  // YouTube制御
  // =========================
  function ytCommandTo(iframeEl, func) {
    if (!iframeEl) return;
    try {
      iframeEl.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: [] }),
        "*"
      );
    } catch (_) {}
  }

  function stopYouTube(iframeEl) {
    ytCommandTo(iframeEl, "stopVideo");
    ytCommandTo(iframeEl, "pauseVideo");
  }

  function isHtmlVideo(el) {
    return !!(el && el.tagName && el.tagName.toLowerCase() === 'video');
  }

  function rememberMainVideoState() {
    if (isHtmlVideo(mainVideo)) {
      mainVideoWasMuted = mainVideo.muted;
      mainVideoWasVolume = mainVideo.volume ?? 1;
    }

    globalMuteWasMuted =
      window.GlobalMute && typeof window.GlobalMute.state === 'boolean'
        ? window.GlobalMute.state
        : null;
  }

  function pauseMainVideoForModal() {
    if (!mainVideo) return;

    if (isHtmlVideo(mainVideo)) {
      try { mainVideo.pause(); } catch (_) {}
      mainVideo.muted = true;
      mainVideo.volume = 0;
      mainVideo.setAttribute('muted', '');
      return;
    }

    stopYouTube(mainVideo);
  }

  function restoreMainVideoSoundState() {
    if (!isHtmlVideo(mainVideo)) return;

    mainVideo.volume = mainVideoWasVolume;
    mainVideo.muted = mainVideoWasMuted;

    if (mainVideoWasMuted) {
      mainVideo.defaultMuted = true;
      mainVideo.setAttribute('muted', '');
    } else {
      mainVideo.removeAttribute('muted');
    }
  }

  function playHtmlVideo(video, forceMuted = false) {
    if (!video) return;

    video.playsInline = true;
    video.setAttribute('playsinline', '');

    if (forceMuted) {
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
    }

    try {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (!video.muted) {
            playHtmlVideo(video, true);
          }
        });
      }
    } catch (_) {
      if (!video.muted) playHtmlVideo(video, true);
    }
  }

  function resumeMainVideo() {
    if (!mainVideo) return;

    if (isHtmlVideo(mainVideo)) {
      restoreMainVideoSoundState();

      playHtmlVideo(mainVideo, mainVideoWasMuted);
      setTimeout(() => playHtmlVideo(mainVideo, mainVideoWasMuted), 120);
      setTimeout(() => playHtmlVideo(mainVideo, mainVideoWasMuted), 420);
      return;
    }

    ytCommandTo(mainVideo, "playVideo");
  }

  // 毎回アンミュート保証（前の動画の状態を引き継がない）
  function forceUnmuteYouTubeSoon(iframeEl) {
    if (!iframeEl) return;

    const start = Date.now();
    const timer = setInterval(() => {
      ytCommandTo(iframeEl, "unMute");
      if (Date.now() - start > 1200) clearInterval(timer);
    }, 200);
  }

  // =========================
  // 背景動画を常に再生維持
  // =========================
  function resumeKeepPlayingVideos() {
    document.querySelectorAll('video[data-keep-playing]').forEach((v) => {
      try {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_) {}
    });
  }

  // =========================
  // Scroll Lock
  // =========================
  function lockScroll() {
    lastScrollY = window.scrollY || 0;
    document.body.classList.add('is-modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lastScrollY}px`;
    document.body.style.width = '100%';
  }

  function unlockScroll() {
    document.body.classList.remove('is-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, lastScrollY);
  }

  // =========================
  // Credit描画
  // =========================
  function renderCredits(title, credits) {
    if (creditTitle) creditTitle.textContent = title || 'Title of Work';
    if (!creditListEl) return;

    creditListEl.innerHTML = '';
    const list = Array.isArray(credits) ? credits : [];

    if (!list.length) {
      const row = document.createElement('div');
      row.className = 'credit-row';
      row.innerHTML =
        '<span class="credit-role">Credit</span><span class="credit-name">—</span>';
      creditListEl.appendChild(row);
      return;
    }

    list.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'credit-row';

      const roleSpan = document.createElement('span');
      roleSpan.className = 'credit-role';
      roleSpan.textContent = c?.role || '';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'credit-name';
      nameSpan.textContent = c?.name || '';

      row.appendChild(roleSpan);
      row.appendChild(nameSpan);
      creditListEl.appendChild(row);
    });
  }

  // =========================
  // OPEN
  // =========================
  function open({ title, video, credits }) {
    lastActiveEl = document.activeElement;
    rememberMainVideoState();

    // メイン停止
    pauseMainVideoForModal();

    // モーダル動画セット
    if (modalVideo) {
      modalVideo.src = withEnableJsApi(video || '');
      forceUnmuteYouTubeSoon(modalVideo); // ← 重要
    }

    renderCredits(title, credits);

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();

    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    modal.classList.remove('modal--credit-open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    // 背景は常に再生維持
    resumeKeepPlayingVideos();

    // グローバルUIもアンミュートへ
    if (window.GlobalMute) {
      window.GlobalMute.set(false);
      pauseMainVideoForModal();
    }

    const firstClose = modal.querySelector('[data-modal-close]');
    if (firstClose) firstClose.focus();
  }

  // =========================
  // CLOSE
  // =========================
  function close() {
    if (!modal.classList.contains('modal--open')) return;

    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    unlockScroll();

    stopYouTube(modalVideo);
    if (modalVideo) modalVideo.src = '';

    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    modal.classList.remove('modal--credit-open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    if (window.GlobalMute && globalMuteWasMuted !== null) {
      window.GlobalMute.set(globalMuteWasMuted);
    }

    resumeKeepPlayingVideos(); // 背景復帰保証
    resumeMainVideo();

    if (lastActiveEl && typeof lastActiveEl.focus === 'function') {
      lastActiveEl.focus();
    }
    lastActiveEl = null;
    globalMuteWasMuted = null;
  }

  // イベント
  closeEls.forEach((el) => el.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) close();
  });

  if (creditToggle && creditOverlay) {
    creditToggle.addEventListener('click', () => {
      const isOpen = creditOverlay.classList.contains('modal__credit--open');
      creditOverlay.classList.toggle('modal__credit--open', !isOpen);
      modal.classList.toggle('modal--credit-open', !isOpen);
      creditToggle.textContent = isOpen ? 'Credit' : 'Close';
    });
  }

  window.GalleryModal = { open, close };
})();
