// assets/js/modal.ui.js
(function () {
  const modal = document.getElementById('galleryModal');
  if (!modal) return;

  const modalVideo = document.getElementById('modalVideo');
  const mainVideo = document.getElementById('mainVideo');
  const closeEls = document.querySelectorAll('[data-modal-close]');

  const creditOverlay = document.getElementById('modalCredit');
  const creditToggle = document.getElementById('creditToggleBtn');
  const creditTitle = document.getElementById('modalCreditTitle');
  const creditListEl = document.getElementById('modalCreditList');

  let lastActiveEl = null;
  let lastScrollY = 0;

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
        JSON.stringify({ event: 'command', func, args: [] }),
        '*'
      );
    } catch (_) {}
  }

  function stopYouTube(iframeEl) {
    ytCommandTo(iframeEl, 'stopVideo');
    ytCommandTo(iframeEl, 'pauseVideo');
  }

  // =========================
  // 背景動画を常に再生維持
  // =========================
  function resumeKeepPlayingVideos() {
    document.querySelectorAll('video[data-keep-playing]').forEach((v) => {
      try {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
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

    // メイン停止
    stopYouTube(mainVideo);

    // モーダル動画セット
    if (modalVideo) {
      modalVideo.src = withEnableJsApi(video || '');

      // ✅ mute.js 側に modalVideo を登録
      if (window.GlobalMute) {
        window.GlobalMute.registerYT('modalVideo');
        window.GlobalMute.apply();
      }
    }

    renderCredits(title, credits);

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();

    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    if (creditToggle) creditToggle.textContent = 'Credit';

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

    // ✅ srcを消す前に unregister
    if (window.GlobalMute) {
      window.GlobalMute.unregisterYT('modalVideo');
    }

    if (modalVideo) modalVideo.src = '';

    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    resumeKeepPlayingVideos();

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
      creditToggle.textContent = isOpen ? 'Credit' : 'Close';
    });
  }

  window.GalleryModal = { open, close };
})();