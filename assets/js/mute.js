let isMuted = false;
const players = new Map();

function onYouTubeIframeAPIReady() {
  document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
    if (players.has(iframe)) return;

    const p = new YT.Player(iframe, {
      events: {
        onReady: (e) => {
          if (isMuted) e.target.mute();
        }
      }
    });

    players.set(iframe, p);
  });

  const observer = new MutationObserver(() => {
    document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
      if (players.has(iframe)) return;

      const p = new YT.Player(iframe, {
        events: {
          onReady: (e) => {
            if (isMuted) e.target.mute();
          }
        }
      });

      players.set(iframe, p);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".global-mute");

  btn.addEventListener("click", () => {
    isMuted = !isMuted;
    btn.classList.toggle("is-muted", isMuted);

    players.forEach(player => {
      if (isMuted) player.mute();
      else player.unMute();
    });
  });
});