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
  const creditInner   = creditOverlay
    ? creditOverlay.querySelector('.modal__credit-inner')
    : null;

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

    const shouldMute =
      window.GlobalMute && typeof window.GlobalMute.state === 'boolean'
        ? window.GlobalMute.state
        : mainVideoWasMuted;

    if (shouldMute) {
      if (mainVideo.dataset.prevVol == null && mainVideoWasVolume > 0) {
        mainVideo.dataset.prevVol = String(mainVideoWasVolume);
      }

      mainVideo.volume = 0;
      mainVideo.muted = true;
      mainVideo.defaultMuted = true;
      mainVideo.setAttribute('muted', '');
      return;
    }

    const prevVol = Number(mainVideo.dataset.prevVol);
    mainVideo.volume = Number.isNaN(prevVol) ? mainVideoWasVolume || 1 : prevVol;
    mainVideo.muted = false;

    delete mainVideo.dataset.prevVol;
    mainVideo.removeAttribute('muted');
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

    const shouldMute =
      window.GlobalMute && typeof window.GlobalMute.state === 'boolean'
        ? window.GlobalMute.state
        : mainVideoWasMuted;

    if (isHtmlVideo(mainVideo)) {
      restoreMainVideoSoundState();

      playHtmlVideo(mainVideo, shouldMute);
      setTimeout(() => playHtmlVideo(mainVideo, shouldMute), 120);
      setTimeout(() => playHtmlVideo(mainVideo, shouldMute), 420);
      return;
    }

    ytCommandTo(mainVideo, "playVideo");
  }

  // 現在のmute状態をモーダル動画にも反映する
  function forceYouTubeMuteStateSoon(iframeEl, muted) {
    if (!iframeEl) return;

    const start = Date.now();
    const timer = setInterval(() => {
      const shouldMute =
        window.GlobalMute && typeof window.GlobalMute.state === 'boolean'
          ? window.GlobalMute.state
          : muted;
      const command = shouldMute ? "mute" : "unMute";

      ytCommandTo(iframeEl, command);
      if (Date.now() - start > 1200) clearInterval(timer);
    }, 200);
  }

  function registerModalVideoWithGlobalMute() {
    if (!window.GlobalMute || typeof window.GlobalMute.registerYT !== 'function') return;

    const register = () => {
      try {
        window.GlobalMute.registerYT('modalVideo');
        if (typeof window.GlobalMute.apply === 'function') {
          window.GlobalMute.apply();
        }
      } catch (_) {}
    };

    requestAnimationFrame(register);
    setTimeout(register, 300);
    setTimeout(register, 900);
  }

  function unregisterModalVideoFromGlobalMute() {
    if (!window.GlobalMute || typeof window.GlobalMute.unregisterYT !== 'function') return;

    try {
      window.GlobalMute.unregisterYT('modalVideo');
    } catch (_) {}
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
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockScroll() {
    document.body.classList.remove('is-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
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

  function resetCreditScroll() {
    if (creditOverlay) creditOverlay.scrollTop = 0;
    if (creditInner) creditInner.scrollTop = 0;
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
      forceYouTubeMuteStateSoon(modalVideo, globalMuteWasMuted === true);
      registerModalVideoWithGlobalMute();
    }

    renderCredits(title, credits);
    resetCreditScroll();

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();

    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    resetCreditScroll();
    modal.classList.remove('modal--credit-open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    // 背景は常に再生維持
    resumeKeepPlayingVideos();

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
    unregisterModalVideoFromGlobalMute();
    if (modalVideo) modalVideo.src = '';

    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    resetCreditScroll();
    modal.classList.remove('modal--credit-open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    resumeKeepPlayingVideos(); // 背景復帰保証
    resumeMainVideo();
    if (window.GlobalMute && typeof window.GlobalMute.apply === 'function') {
      window.GlobalMute.apply();
    }

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
      if (!isOpen) {
        resetCreditScroll();
        requestAnimationFrame(resetCreditScroll);
      }
    });
  }

  window.GalleryModal = { open, close };
})();
