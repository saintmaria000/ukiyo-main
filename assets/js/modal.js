// assets/js/modal.js
document.addEventListener('DOMContentLoaded', () => {
  // ======================================
  //  Gallery モーダル制御（動画 + Credit）
  // ======================================
  const modal          = document.getElementById('galleryModal');
  const modalVideo     = document.getElementById('modalVideo'); // iframe
  const galleryItems   = document.querySelectorAll('.gallery-item');
  const modalCloseEls  = document.querySelectorAll('[data-modal-close]');

  const creditOverlay  = document.getElementById('modalCredit');
  const creditToggle   = document.getElementById('creditToggleBtn');
  const creditTitle    = document.getElementById('modalCreditTitle');
  const creditListEl   = document.getElementById('modalCreditList');

  if (!modal) {
    // このページにモーダルがなければ何もしない
    return;
  }

  function openModalFromItem(item) {
    const title       = item.dataset.title || 'Title of Work';
    const videoSrc    = item.dataset.video || '';
    const creditsJson = item.dataset.credits || '[]';

    let credits = [];
    try {
      credits = JSON.parse(creditsJson);
    } catch (e) {
      credits = [];
    }

    // タイトル
    if (creditTitle) {
      creditTitle.textContent = title;
    }

    // 動画URL
    if (modalVideo) {
      modalVideo.src = videoSrc;
    }

    // クレジット表の生成
    if (creditListEl) {
      creditListEl.innerHTML = ''; // 一旦クリア

      credits.forEach((c) => {
        const row = document.createElement('div');
        row.className = 'credit-row';

        const roleSpan = document.createElement('span');
        roleSpan.className = 'credit-role';
        roleSpan.textContent = c.role || '';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'credit-name';
        nameSpan.textContent = c.name || '';

        row.appendChild(roleSpan);
        row.appendChild(nameSpan);
        creditListEl.appendChild(row);
      });
    }

    // モーダル表示
    modal.classList.add('modal--open');

    // クレジットは最初は閉じておく
    if (creditOverlay) {
      creditOverlay.classList.remove('modal__credit--open');
    }
    if (creditToggle) {
      creditToggle.textContent = 'Credit';
    }
  }

  function closeModal() {
    modal.classList.remove('modal--open');

    // モーダル動画停止
    if (modalVideo) {
      modalVideo.src = '';
    }

    // クレジットリセット
    if (creditOverlay) {
      creditOverlay.classList.remove('modal__credit--open');
    }
    if (creditToggle) {
      creditToggle.textContent = 'Credit';
    }
  }

  // ギャラリー項目クリックでモーダルを開く
  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      openModalFromItem(item);
    });
  });

  // ×ボタン・背景クリック（data-modal-close）で閉じる
  modalCloseEls.forEach((el) => {
    el.addEventListener('click', () => {
      closeModal();
    });
  });

  // Esc キーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('modal--open')) {
        closeModal();
      }
    }
  });

  // Credit ボタンをトグル動作に
  if (creditToggle && creditOverlay) {
    creditToggle.addEventListener('click', () => {
      const isOpen = creditOverlay.classList.contains('modal__credit--open');

      if (!isOpen) {
        // クレジットを表示
        creditOverlay.classList.add('modal__credit--open');
        creditToggle.textContent = 'Close';
      } else {
        // クレジットを非表示
        creditOverlay.classList.remove('modal__credit--open');
        creditToggle.textContent = 'Credit';
      }
    });
  }
});