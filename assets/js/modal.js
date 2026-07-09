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

  // =========================
  // YouTube URL補完
  //  - 押して開いた瞬間に「音アリ」で自動再生を狙う（autoplay=1 / mute=0）
  //  - ブラウザに音アリ再生を拒否された場合は、後述の保険でミュート再生に落とす
  //  - controls は付けない → YouTube標準のコントローラーはそのまま表示
  // =========================
  function withEnableJsApi(url) {
    if (!url) return '';
    try {
      const u = new URL(url, window.location.href);
      const isYouTube =
        /(^|\.)youtube\.com$/.test(u.hostname) ||
        /(^|\.)youtube-nocookie\.com$/.test(u.hostname);

      if (isYouTube) {
        u.searchParams.set('enablejsapi', '1');
        u.searchParams.set('autoplay', '1');
        u.searchParams.set('mute', '0');
        u.searchParams.set('playsinline', '1');
        u.searchParams.set('rel', '0');
      }
      return u.toString();
    } catch {
      return url;
    }
  }

  // =========================
  // YouTube制御（enablejsapi=1 の iframe には postMessage で直接指示できる。
  // 自前で YT.Player を生成・破棄しないので iframe 自体は壊れない）
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

  // モーダル動画を「音アリで強制再生」する。
  //  - 開いた直後にしばらく unMute + playVideo を送り続けて確実に鳴らす
  //  - ブラウザが音アリ再生を拒否して止まった場合だけ、mute + play に落とす
  //    （黙って止まらないための保険。次のユーザー操作で音は復帰させられる）
  function forcePlayModalWithSound(iframeEl) {
    if (!iframeEl) return;

    const start = Date.now();
    let fellBackToMute = false;

    const timer = setInterval(() => {
      // 音アリで再生を促す
      if (!fellBackToMute) {
        ytCommandTo(iframeEl, "unMute");
        ytCommandTo(iframeEl, "playVideo");
      } else {
        ytCommandTo(iframeEl, "mute");
        ytCommandTo(iframeEl, "playVideo");
      }
      if (Date.now() - start > 1500) clearInterval(timer);
    }, 200);

    // 800ms 経っても再生が始まっていなければ、音アリ拒否とみなしミュート再生に落とす
    setTimeout(() => { fellBackToMute = true; }, 800);
  }

  // 一度でも画面を操作したら、モーダル動画の音を戻す（保険でミュートに落ちた時用）
  function restoreModalSoundOnInteraction(iframeEl) {
    if (!iframeEl) return;
    const handler = () => ytCommandTo(iframeEl, "unMute");
    window.addEventListener('pointerdown', handler, { once: true, passive: true });
    window.addEventListener('touchstart', handler, { once: true, passive: true });
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

    // モーダル動画セット（URLに autoplay=1/mute=0。押した勢いで音アリ再生を狙う）
    if (modalVideo) {
      modalVideo.src = withEnableJsApi(video || '');
      forcePlayModalWithSound(modalVideo);
      restoreModalSoundOnInteraction(modalVideo);
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

    // 停止して src を空にするだけ（iframe要素は破棄しない＝次回も再利用できる）
    stopYouTube(modalVideo);
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