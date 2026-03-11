(function () {
  const body = document.body;
  const galleryScroll = document.querySelector('.gallery-scroll');
  const mq = window.matchMedia('(pointer: coarse) and (orientation: landscape)');

  if (!galleryScroll) return;

  let startY = 0;

  function isGalleryView() {
    return body.classList.contains('view-left');
  }

  function shouldLockPageScroll() {
    return mq.matches && isGalleryView();
  }

  function updateGalleryScrollLock() {
    body.classList.toggle('is-gallery-scroll-lock', shouldLockPageScroll());
  }

  function canScroll(el) {
    return el.scrollHeight > el.clientHeight;
  }

  function isAtTop(el) {
    return el.scrollTop <= 0;
  }

  function isAtBottom(el) {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
  }

  // ----------------------------------------
  // body class の変化を監視
  // view-left / view-center / view-right の切替に追従
  // ----------------------------------------
  const observer = new MutationObserver(() => {
    updateGalleryScrollLock();
  });

  observer.observe(body, {
    attributes: true,
    attributeFilter: ['class']
  });

  // ----------------------------------------
  // リサイズ・回転対応
  // ----------------------------------------
  window.addEventListener('resize', updateGalleryScrollLock);
  window.addEventListener('orientationchange', updateGalleryScrollLock);

  if (mq.addEventListener) {
    mq.addEventListener('change', updateGalleryScrollLock);
  } else if (mq.addListener) {
    mq.addListener(updateGalleryScrollLock);
  }

  // ----------------------------------------
  // Gallery内の touch 開始位置を記録
  // iPhone用
  // ----------------------------------------
  galleryScroll.addEventListener(
    'touchstart',
    (e) => {
      if (!shouldLockPageScroll()) return;
      if (!e.touches || !e.touches.length) return;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  // ----------------------------------------
  // Gallery外は止める
  // Gallery内は端だけ止める
  // iPhoneのバウンス抜け対策
  // ----------------------------------------
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!shouldLockPageScroll()) return;

      const scroller = e.target.closest('.gallery-scroll');

      // Gallery外は止める
      if (!scroller) {
        e.preventDefault();
        return;
      }

      // スクロールする中身がない時は止める
      if (!canScroll(scroller)) {
        e.preventDefault();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // 上端でさらに下に引く時
      if (isAtTop(scroller) && deltaY > 0) {
        e.preventDefault();
      }

      // 下端でさらに上に引く時
      if (isAtBottom(scroller) && deltaY < 0) {
        e.preventDefault();
      }

      startY = currentY;
    },
    { passive: false }
  );

  // ----------------------------------------
  // 初期実行
  // ----------------------------------------
  updateGalleryScrollLock();
})();