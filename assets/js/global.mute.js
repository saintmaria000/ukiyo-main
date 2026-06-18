// assets/js/mute.js
(() => {
  const btn = document.querySelector('.global-mute');
  if (!btn) return;

  // ==== Global state (唯一の真実) ====
  let isMuted = true;

  // ==== Players ====
  const players = new Map();      // id -> YT.Player
  const watchers = new Map();     // id -> interval id
  let isSyncingFromPlayer = false;

  // ==== UI ====
  function render() {
    btn.classList.toggle('is-muted', isMuted);
    btn.setAttribute('aria-pressed', String(isMuted));
  }

  // ==== HTML5 media ====
  function applyHtmlMedia() {
    document.querySelectorAll('video, audio').forEach((m) => {
      if (document.body.classList.contains('is-modal-open') && m.id === 'mainVideo') {
        if (m.dataset.prevVol == null) m.dataset.prevVol = String(m.volume ?? 1);
        m.muted = true;
        m.volume = 0;
        return;
      }

      if (isMuted) {
        if (m.dataset.prevVol == null) m.dataset.prevVol = String(m.volume ?? 1);
        m.muted = true;
        m.volume = 0;
      } else {
        m.muted = false;
        if (m.dataset.prevVol != null) {
          const v = Number(m.dataset.prevVol);
          if (!Number.isNaN(v)) m.volume = v;
          delete m.dataset.prevVol;
        }
      }
    });
  }

  // ==== Apply to all YT players ====
  function applyYT() {
    players.forEach((p) => {
      try {
        if (isMuted) p.mute();
        else p.unMute();
      } catch (_) {}
    });
  }

  function setMuted(next, source = 'ui') {
    const normalized = !!next;
    if (isMuted === normalized) {
      render();
      return;
    }

    isMuted = normalized;
    render();
    applyHtmlMedia();

    // プレイヤー側の変更を受けて同期した時は、無限往復を避ける
    if (source !== 'player') {
      applyYT();
    }
  }

  btn.addEventListener('click', () => setMuted(!isMuted, 'ui'));
  render();

  // ==== YT player creation ====
  function canInitYT() {
    return !!(window.YT && window.YT.Player);
  }

  function startMutedWatcher(id, player) {
    stopMutedWatcher(id);

    let lastKnownMuted = null;

    const timer = setInterval(() => {
      try {
        if (!player || typeof player.isMuted !== 'function') return;

        const currentMuted = !!player.isMuted();

        if (lastKnownMuted === null) {
          lastKnownMuted = currentMuted;
          return;
        }

        if (currentMuted !== lastKnownMuted) {
          lastKnownMuted = currentMuted;

          if (isSyncingFromPlayer) return;
          isSyncingFromPlayer = true;
          setMuted(currentMuted, 'player');
          isSyncingFromPlayer = false;
        }
      } catch (_) {}
    }, 250);

    watchers.set(id, timer);
  }

  function stopMutedWatcher(id) {
    const timer = watchers.get(id);
    if (!timer) return;
    clearInterval(timer);
    watchers.delete(id);
  }

  function initPlayer(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const src = el.getAttribute('src') || '';
    if (!src) return;

    if (!/enablejsapi=1/.test(src)) {
      console.warn(`[Mute] ${id} iframe src needs enablejsapi=1`);
    }

    if (players.has(id)) {
      applyYT();
      const existing = players.get(id);
      if (existing) startMutedWatcher(id, existing);
      return;
    }

    if (!canInitYT()) return;

    try {
      const player = new YT.Player(id, {
        events: {
          onReady: () => {
            try {
              isMuted ? player.mute() : player.unMute();
            } catch (_) {}

            startMutedWatcher(id, player);
          },
          onStateChange: (e) => {
            // 再生したら自動でミュート解除
            if (e && e.data === 1 && isMuted) {
              setMuted(false, 'ui');
            }
          }
        }
      });

      players.set(id, player);
    } catch (err) {
      console.warn('[Mute] YT.Player init failed:', id, err);
    }
  }

  function destroyPlayer(id) {
    stopMutedWatcher(id);

    const p = players.get(id);
    if (!p) return;
    try { p.destroy(); } catch (_) {}
    players.delete(id);
  }

  // ==== Public API ====
  window.GlobalMute = {
    set: setMuted,
    get state() { return isMuted; },

    registerYT(id) { initPlayer(id); },
    unregisterYT(id) { destroyPlayer(id); },
    apply() { render(); applyHtmlMedia(); applyYT(); },
  };

  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (typeof prev === 'function') prev();
    initPlayer('mainVideo');
  };

  setMuted(isMuted, 'ui');

  if (canInitYT()) initPlayer('mainVideo');
})();
