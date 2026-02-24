// assets/js/mute.js
let isMuted = false;

function sendYTCommand(func) {
  document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
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

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".global-mute");
  if (!btn) return;

  const update = () => {
    btn.classList.toggle("is-muted", isMuted);
  };

  btn.addEventListener("click", () => {
    isMuted = !isMuted;
    update();
    sendYTCommand(isMuted ? "mute" : "unMute");
  });

  update();
});