// assets/js/mute.js
(function () {
  let isMuted = false;

  // --- UI ---
  function updateUI() {
    const btn = document.querySelector(".global-mute");
    if (!btn) return;
    btn.classList.toggle("is-muted", isMuted);
    btn.setAttribute("aria-pressed", String(isMuted));
  }

  // --- HTML5 video/audio ---
  function applyHtmlMediaMute() {
    document.querySelectorAll("video, audio").forEach((m) => {
      m.muted = isMuted;
      if (isMuted) m.volume = 0;
    });
  }

  // --- YouTube IFrame API 管理 ---
  const YTPlayers = new Map(); // id -> YT.Player
  let ytReady = false;

  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      ytReady = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        ytReady = true;
        if (typeof prev === "function") prev();
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }

  function ensurePlayer(iframeId) {
    const el = document.getElementById(iframeId);
    if (!el) return;

    // すでに作ってたらOK
    if (YTPlayers.has(iframeId)) return;

    // API未準備なら後で
    if (!ytReady || !(window.YT && window.YT.Player)) return;

    try {
      const player = new YT.Player(iframeId, {
        events: {
          onReady: () => {
            // グローバル状態を反映
            if (isMuted) player.mute();
            else player.unMute();
          }
        }
      });
      YTPlayers.set(iframeId, player);
    } catch (e) {
      console.warn("[Mute] YT.Player init failed:", iframeId, e);
    }
  }

  // グローバル状態をYouTubeへ反映
  function applyYouTubeMute() {
    YTPlayers.forEach((player) => {
      try {
        if (isMuted) player.mute();
        else player.unMute();
      } catch (_) {}
    });
  }

  // YouTube内の🔇操作を拾う（イベントが無いのでポーリング）
  function startYouTubeSyncPoll() {
    setInterval(() => {
      // 監視対象：mainVideo / modalVideo（あれば）
      ensurePlayer("mainVideo");
      ensurePlayer("modalVideo");

      // どれか1つでも「ミュート解除」になってたら、グローバルも解除に寄せる
      // （逆に全てミュートならグローバルもミュートに寄せる、でもOK）
      let anyUnmuted = false;
      let anyKnown = false;

      YTPlayers.forEach((player) => {
        try {
          const m = player.isMuted(); // boolean
          anyKnown = true;
          if (m === false) anyUnmuted = true;
        } catch (_) {}
      });

      if (!anyKnown) return;

      // YouTube側でユーザーが🔇解除した → グローバルも解除（UI矛盾をなくす）
      if (anyUnmuted && isMuted) {
        isMuted = false;
        updateUI();
        applyHtmlMediaMute(); // サイト側HTML5も合わせる（必要なら）
      }
      // 逆同期もしたいなら↓をON（YouTube側が全部ミュートならグローバルもミュート）
      // else if (!anyUnmuted && !isMuted) {
      //   isMuted = true;
      //   updateUI();
      //   applyHtmlMediaMute();
      // }
    }, 250);
  }

  // --- 状態適用 ---
  function applyMuteState() {
    updateUI();
    applyHtmlMediaMute();
    applyYouTubeMute();
  }

  function setMuted(state) {
    isMuted = Boolean(state);
    applyMuteState();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const btn = document.querySelector(".global-mute");
    if (btn) {
      btn.addEventListener("click", () => {
        setMuted(!isMuted);
      });
      updateUI();
    }

    // YouTube APIロード＆同期開始
    await loadYouTubeAPI();
    ytReady = true;
    ensurePlayer("mainVideo");
    ensurePlayer("modalVideo");
    startYouTubeSyncPoll();
  });

  // 外部公開（modal.ui.js から呼ぶ用）
  window.GlobalMute = {
    apply: applyMuteState,
    set: setMuted,
    get state() {
      return isMuted;
    }
  };
})();