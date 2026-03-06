// assets/js/mute.js
(() => {
  const btn = document.querySelector('.global-mute');
  if (!btn) return;

  // ==== Global state (唯一の真実) ====
  let isMuted = true; // ←基本はミュート開始がおすすめ（必要ならfalseに）

  // ==== Players ====
  const players = new Map(); // id -> YT.Player

  // ==== UI ====
  function render() {
    btn.classList.toggle('is-muted', isMuted);
    btn.setAttribute('aria-pressed', String(isMuted));
  }

  // ==== HTML5 media (About背景動画など) ====
  // muted解除時に元音量へ戻したいなら保存して復元
  function applyHtmlMedia() {
    document.querySelectorAll('video, audio').forEach((m) => {
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

  function setMuted(next) {
    isMuted = !!next;
    render();
    applyHtmlMedia();
    applyYT();
  }

  btn.addEventListener('click', () => setMuted(!isMuted));
  render();

  // ==== YT player creation ====
  function canInitYT() {
    return !!(window.YT && window.YT.Player);
  }

  function initPlayer(id) {
    const el = document.getElementById(id);
    if (!el) return;

    // srcがまだ無いとPlayer化できない（modalでよく起きる）
    const src = el.getAttribute('src') || '';
    if (!src) return;

    // enablejsapi=1 がないと制御できない
    if (!/enablejsapi=1/.test(src)) {
      console.warn(`[Mute] ${id} iframe src needs enablejsapi=1`);
    }

    // 既存があるなら再利用
    if (players.has(id)) {
      // 念のため状態反映
      applyYT();
      return;
    }

    if (!canInitYT()) return;

    try {
      const player = new YT.Player(id, {
        events: {
          onReady: () => {
            // 現在のグローバル状態を反映
            try { isMuted ? player.mute() : player.unMute(); } catch (_) {}
          },
          onStateChange: (e) => {
            // 再生したら自動でミュート解除（main/modal両方に効く）
            // PLAYING = 1
            if (e && e.data === 1 && isMuted) setMuted(false);
          }
        }
      });
      players.set(id, player);
    } catch (err) {
      console.warn('[Mute] YT.Player init failed:', id, err);
    }
  }

  function destroyPlayer(id) {
    const p = players.get(id);
    if (!p) return;
    try { p.destroy(); } catch (_) {}
    players.delete(id);
  }

  // ==== Public API (modal側から呼ぶ) ====
  window.GlobalMute = {
    set: setMuted,
    get state() { return isMuted; },

    // modalを開いてsrcを入れた “直後” に呼ぶ
    registerYT(id) { initPlayer(id); },

    // modalを閉じてsrcを消す前後で呼ぶ（破棄してズレ防止）
    unregisterYT(id) { destroyPlayer(id); },

    // 何か変えたら反映したい時用
    apply() { render(); applyHtmlMedia(); applyYT(); },
  };

  // ==== Hook YouTube API ready safely ====
  // 既に他ファイルが onYouTubeIframeAPIReady を使ってても潰さない
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (typeof prev === 'function') prev();
    initPlayer('mainVideo');      // mainは常に登録
    // modalは開いた時に registerYT('modalVideo') で登録する
  };

  // 初期状態を適用
  setMuted(isMuted);

  // APIがすでに読み込み済みなら即初期化
  if (canInitYT()) initPlayer('mainVideo');
})();