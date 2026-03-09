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
  let isOpen = false;

  // =========================
  // URL正規化
  // =========================
  function normalizeYouTubeUrl(url) {
    if (!url) return '';

    try {
      const u = new URL(url, window.location.href);
      const isYouTube =
        /(^|\.)youtube\.com$/.test(u.hostname) ||
        /(^|\.)youtube-nocookie\.com$/.test(u.hostname);

      if (isYouTube) {
        if (!u.searchParams.has('enablejsapi')) {
          u.searchParams.set('enablejsapi', '1');
        }
        if (!u.searchParams.has('autoplay')) {
          u.searchParams.set('autoplay', '1');
        }
        if (!u.searchParams.has('rel')) {
          u.searchParams.set('rel', '0');
        }
      }

      return u.toString();
    } catch (_) {
      return url;
    }
  }

  // =========================
  // YouTube制御
  // =========================
  function ytCommandTo(iframeEl, func) {
    if (!iframeEl || !iframeEl.contentWindow) return;

    try {
      iframeEl.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args: []
        }),
        '*'
      );
    } catch (_) {}
  }

  function stopYouTube(iframeEl) {
    if (!iframeEl) return;
    ytCommandTo(iframeEl, 'stopVideo');
    ytCommandTo(iframeEl, 'pauseVideo');
  }

  function resetIframe(iframeEl) {
    if (!iframeEl) return;
    stopYouTube(iframeEl);
    iframeEl.src = '';
  }

  // =========================
  // 背景動画維持
  // =========================
  function resumeKeepPlayingVideos() {
    document.querySelectorAll('video[data-keep-playing]').forEach((video) => {
      try {
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
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
    document.body.style.width = '100%';
  }

  function unlockScroll() {
    document.body.classList.remove('is-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.width = '';

    window.scrollTo(0, lastScrollY);
  }

  // =========================
  // Credit描画
  // =========================
  function renderCredits(title, credits) {
    if (creditTitle) {
      creditTitle.textContent = title || 'Title of Work';
    }

    if (!creditListEl) return;

    creditListEl.innerHTML = '';

    const list = Array.isArray(credits) ? credits : [];

    if (!list.length) {
      const row = document.createElement('div');
      row.className = 'credit-row';

      const roleSpan = document.createElement('span');
      roleSpan.className = 'credit-role';
      roleSpan.textContent = 'Credit';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'credit-name';
      nameSpan.textContent = '—';

      row.appendChild(roleSpan);
      row.appendChild(nameSpan);
      creditListEl.appendChild(row);
      return;
    }

    list.forEach((credit) => {
      const row = document.createElement('div');
      row.className = 'credit-row';

      const roleSpan = document.createElement('span');
      roleSpan.className = 'credit-role';
      roleSpan.textContent = credit?.role || '';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'credit-name';
      nameSpan.textContent = credit?.name || '';

      row.appendChild(roleSpan);
      row.appendChild(nameSpan);
      creditListEl.appendChild(row);
    });
  }

  function resetCreditState() {
    if (creditOverlay) {
      creditOverlay.classList.remove('modal__credit--open');
    }
    if (creditToggle) {
      creditToggle.textContent = 'Credit';
    }
  }

  // =========================
  // UI状態
  // =========================
  function showModalUI() {
    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();
    resetCreditState();
    isOpen = true;
  }

  function hideModalUI() {
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    unlockScroll();
    resetCreditState();
    isOpen = false;
  }

  function focusFirstCloseTarget() {
    const firstClose = modal.querySelector('[data-modal-close]');
    if (firstClose) {
      firstClose.focus();
    }
  }

  function restoreFocus() {
    if (lastActiveEl && typeof lastActiveEl.focus === 'function') {
      lastActiveEl.focus();
    }
    lastActiveEl = null;
  }

  // =========================
  // OPEN
  // =========================
  function open({ title, video, credits }) {
    lastActiveEl = document.activeElement;

    // 背景側のメイン動画停止
    stopYouTube(mainVideo);

    // モーダル側の前回状態をリセット
    if (window.GlobalMute) {
      window.GlobalMute.unregisterYT('modalVideo');
    }
    resetIframe(modalVideo);

    renderCredits(title, credits);
    showModalUI();
    resumeKeepPlayingVideos();

    const nextUrl = normalizeYouTubeUrl(video || '');

    if (modalVideo && nextUrl) {
      requestAnimationFrame(() => {
        modalVideo.src = nextUrl;

        if (window.GlobalMute) {
          window.GlobalMute.registerYT('modalVideo');
          window.GlobalMute.apply();
        }
      });
    }

    focusFirstCloseTarget();
  }

  // =========================
  // CLOSE
  // =========================
  function close() {
    if (!isOpen) return;

    hideModalUI();

    if (window.GlobalMute) {
      window.GlobalMute.unregisterYT('modalVideo');
    }

    resetIframe(modalVideo);
    resumeKeepPlayingVideos();
    restoreFocus();
  }

  // =========================
  // イベント
  // =========================
  closeEls.forEach((el) => {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  });

  if (creditToggle && creditOverlay) {
    creditToggle.addEventListener('click', () => {
      const willOpen = !creditOverlay.classList.contains('modal__credit--open');
      creditOverlay.classList.toggle('modal__credit--open', willOpen);
      creditToggle.textContent = willOpen ? 'Close' : 'Credit';
    });
  }

  window.GalleryModal = {
    open,
    close
  };
})();