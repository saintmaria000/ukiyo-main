// assets/js/mute.js
(function () {
  let isMuted = false;

  // YouTube iframeへコマンド（※YouTube側に届くよう targetOrigin は "*" を使用）
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

  // HTML5 <video>/<audio> を強制ミュート（サイト内の全音）
  function applyHtmlMediaMute() {
    document.querySelectorAll("video, audio").forEach((m) => {
      m.muted = isMuted;
      // 「絶対に音を出さない」寄りに倒すなら volume も 0
      if (isMuted) m.volume = 0;
    });
  }

  function applyMuteState() {
    applyHtmlMediaMute();
    sendYTCommand(isMuted ? "mute" : "unMute");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".global-mute");
    if (!btn) return;

    const updateUI = () => {
      btn.classList.toggle("is-muted", isMuted);
      btn.setAttribute("aria-pressed", String(isMuted));
    };

    btn.addEventListener("click", () => {
      isMuted = !isMuted;
      updateUI();
      applyMuteState();
    });

    updateUI();
  });

  // 外部から適用（モーダル open直後など）
  window.GlobalMute = {
    apply: applyMuteState,
    set(state) {
      isMuted = Boolean(state);
      applyMuteState();
    },
    get state() {
      return isMuted;
    }
  };
})();