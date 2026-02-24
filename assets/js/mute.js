let isMuted = false;
let players = [];

function createPlayer(iframe) {
  try {
    const player = new YT.Player(iframe, {
      events: {
        onReady: (e) => {
          if (isMuted) e.target.mute();
        }
      }
    });
    players.push(player);
  } catch (e) {
    console.warn("Player init failed", e);
  }
}

function initPlayers() {
  document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(iframe => {
    if (!iframe.dataset.ytInit) {
      iframe.dataset.ytInit = "true";
      createPlayer(iframe);
    }
  });
}

window.onYouTubeIframeAPIReady = () => {
  initPlayers();

  const observer = new MutationObserver(() => {
    initPlayers();
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".global-mute");

  btn.addEventListener("click", () => {
    isMuted = !isMuted;
    btn.classList.toggle("is-muted", isMuted);

    players.forEach(p => {
      try {
        if (isMuted) p.mute();
        else p.unMute();
      } catch {}
    });
  });
});