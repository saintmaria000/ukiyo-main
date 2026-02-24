// assets/js/modal.ui.js
(function () {
  const modal      = document.getElementById('galleryModal');
  if (!modal) return;

  const modalVideo = document.getElementById('modalVideo'); // iframe (YouTube embed)
  const mainVideo  = document.getElementById('mainVideo');  // iframe (YouTube embed)
  const closeEls   = document.querySelectorAll('[data-modal-close]');

  const creditOverlay = document.getElementById('modalCredit');
  const creditToggle  = document.getElementById('creditToggleBtn');
  const creditTitle   = document.getElementById('modalCreditTitle');
  const creditListEl  = document.getElementById('modalCreditList');

  let lastActiveEl = null;
  let lastScrollY = 0;

  // YouTube JS API が効くように embed URLに enablejsapi=1 を補完
  function withEnableJsApi(url) {
    if (!url) return '';
    try {
      const u = new URL(url, window.location.href);
      const isYouTube =
        /(^|\.)youtube\.com$/.test(u.hostname) || /(^|\.)youtube-nocookie\.com$/.test(u.hostname);

      if (isYouTube) {
        if (!u.searchParams.has('enablejsapi')) u.searchParams.set('enablejsapi', '1');
      }
      return u.toString();
    } catch {
      return url;
    }
  }

  // YouTube iframeへコマンド
  function ytCommandTo(iframeEl, func) {
    if (!iframeEl) return;
    try {
      iframeEl.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: [] }),
        "*"
      );
    } catch (e) {
      console.warn("[Modal] YT postMessage failed:", e);
    }
  }

  // srcリセットではなく stop/pause で確実停止（メインが勝手に再ロード再生するのを防ぐ）
  function stopYouTube(iframeEl) {
    ytCommandTo(iframeEl, "stopVideo");
    ytCommandTo(iframeEl, "pauseVideo");
  }

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
      roleSpan.textContent = (c && c.role) ? c.role : '';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'credit-name';
      nameSpan.textContent = (c && c.name) ? c.name : '';

      row.appendChild(roleSpan);
      row.appendChild(nameSpan);
      creditListEl.appendChild(row);
    });
  }

  function open({ title, video, credits }) {
    lastActiveEl = document.activeElement;

    // ✅ Gallery再生時：メイン停止（srcを触らない＝勝手にリセット再生しない）
    stopYouTube(mainVideo);

    // ✅ モーダル動画セット（enablejsapi=1 補完）
    if (modalVideo) modalVideo.src = withEnableJsApi(video || '');

    // Credit
    renderCredits(title, credits);

    // 表示
    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();

    // Creditは閉じて開始
    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    // ✅ 現在のミュート状態をモーダルにも適用（どの状況でも全音遮断）
    if (window.GlobalMute) window.GlobalMute.apply();

    // フォーカス
    const firstClose = modal.querySelector('[data-modal-close]');
    if (firstClose) firstClose.focus();
  }

  function close() {
    if (!modal.classList.contains('modal--open')) return;

    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    unlockScroll();

    // ✅ Gallery閉じたとき：Gallery停止（stop/pause → src空）
    stopYouTube(modalVideo);
    if (modalVideo) modalVideo.src = '';

    // Credit reset
    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    if (creditToggle) creditToggle.textContent = 'Credit';

    // フォーカスを元に戻す
    if (lastActiveEl && typeof lastActiveEl.focus === 'function') {
      lastActiveEl.focus();
    }
    lastActiveEl = null;
  }

  // 閉じる
  closeEls.forEach((el) => el.addEventListener('click', close));

  // Escで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) close();
  });

  // Creditトグル
  if (creditToggle && creditOverlay) {
    creditToggle.addEventListener('click', () => {
      const isOpen = creditOverlay.classList.contains('modal__credit--open');
      creditOverlay.classList.toggle('modal__credit--open', !isOpen);
      creditToggle.textContent = isOpen ? 'Credit' : 'Close';
    });
  }

  // 公開
  window.GalleryModal = { open, close };
})();