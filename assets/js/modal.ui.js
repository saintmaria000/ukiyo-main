// assets/js/modal.ui.js
(function () {
  const modal         = document.getElementById('galleryModal');
  const modalVideo    = document.getElementById('modalVideo');
  const mainVideo     = document.getElementById('mainVideo');
  const closeEls      = document.querySelectorAll('[data-modal-close]');

  const creditOverlay = document.getElementById('modalCredit');
  const creditToggle  = document.getElementById('creditToggleBtn');
  const creditTitle   = document.getElementById('modalCreditTitle');
  const creditListEl  = document.getElementById('modalCreditList');

  if (!modal) return;

  function forceStopIframe(iframeEl) {
    if (!iframeEl) return;
    const src = iframeEl.getAttribute('src');
    if (!src) return;
    iframeEl.setAttribute('src', '');
    iframeEl.setAttribute('src', src);
  }

  function setBodyModalState(isOpen) {
    document.body.classList.toggle('is-modal-open', Boolean(isOpen));
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
    // MAIN停止
    forceStopIframe(mainVideo);

    // 動画
    if (modalVideo) modalVideo.src = video || '';

    // Credit
    renderCredits(title, credits);

    // 表示
    modal.classList.add('modal--open');
    setBodyModalState(true);

    // Creditは閉じて開始
    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    if (creditToggle) creditToggle.textContent = 'Credit';
  }

  function close() {
    modal.classList.remove('modal--open');
    setBodyModalState(false);

    // モーダル動画停止
    if (modalVideo) modalVideo.src = '';

    // Credit reset
    if (creditOverlay) creditOverlay.classList.remove('modal__credit--open');
    if (creditToggle) creditToggle.textContent = 'Credit';
  }

  // 閉じる：背景クリックなど
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
