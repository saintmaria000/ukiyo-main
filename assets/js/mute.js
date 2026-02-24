// assets/js/mute.js
(function () {
  let isMuted = false;

  // ===== UI同期 =====
  function updateUI() {
    const btn = document.querySelector(".global-mute");
    if (!btn) return;
    btn.classList.toggle("is-muted", isMuted);
    btn.setAttribute("aria-pressed", String(isMuted));
  }

  // ===== YouTube iframeへコマンド（YouTube側に届くよう targetOrigin は "*"）=====
  function sendYTCommand(func) {
    document
      .querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]')
      .forEach((iframe) => {
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: "command", func, args: [] }),
            "*"
          );
        } catch (e) {
          console.warn("[Mute] postMessage failed:", e);
        }
      });
  }

  // ===== HTML5 <video>/<audio> をミュート同期 =====
  function applyHtmlMediaMute() {
    document.querySelectorAll("video, audio").forEach((m) => {
      m.muted = isMuted;
      if (isMuted) m.volume = 0; // 「絶対に音を出さない」寄り
    });
  }

  function applyMuteState() {
    applyHtmlMediaMute();
    sendYTCommand(isMuted ? "mute" : "unMute");
  }

  // ===== 「どこかで音が鳴ったら」→ 自動でミュート解除してUIも同期 =====
  // ここでは HTMLMediaElement の play / volumechange などを監視して
  // “音が出る状態で再生された” をトリガーにする
  function autoUnmuteIfSound(e) {
    if (!isMuted) return;

    const el = e.target;
    if (!(el instanceof HTMLMediaElement)) return;

    // muted=false かつ volume>0 なら “音が出る状態”
    const vol = typeof el.volume === "number" ? el.volume : 1;
    if (!el.muted && vol > 0) {
      // ミュート解除（UI同期→全体へ反映）
      isMuted = false;
      updateUI();
      applyMuteState();

      // デバッグしたければここ
      // console.warn("[Mute] Auto unmuted because sound started:", el);
    }
  }

  // DOM監視：後から追加される video/audio にも効くように document で捕まえる
  function attachAutoUnmuteListeners() {
    document.addEventListener("play", autoUnmuteIfSound, true);
    document.addEventListener("volumechange", autoUnmuteIfSound, true);
    document.addEventListener("playing", autoUnmuteIfSound, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".global-mute");
    if (!btn) return;

    btn.addEventListener("click", () => {
      isMuted = !isMuted;
      updateUI();
      applyMuteState();
    });

    updateUI();
    attachAutoUnmuteListeners();
  });

  // 外部から適用（モーダル open直後など）
  window.GlobalMute = {
    apply: applyMuteState,
    set(state) {
      isMuted = Boolean(state);
      updateUI();      // ★ ここが重要：外部setでもUIが必ず同期される
      applyMuteState();
    },
    get state() {
      return isMuted;
    }
  };
})();