// assets/js/entrance/gate.js

export function openEntranceGateFallback(dom, runtime) {
  const { entranceGate } = dom;
  const { coarsePortraitQuery } = runtime;

  if (!entranceGate) return;

  entranceGate.classList.add("is-visible");
  entranceGate.setAttribute("aria-hidden", "false");

  const rotatePanel = entranceGate.querySelector('[data-gate-panel="rotate"]');
  const languagePanel = entranceGate.querySelector('[data-gate-panel="language"]');
  const isPortraitPhone = coarsePortraitQuery.matches;

  if (rotatePanel) rotatePanel.classList.toggle("is-active", isPortraitPhone);
  if (languagePanel) languagePanel.classList.toggle("is-active", !isPortraitPhone);
}

export function fireEntranceDone(dom, runtime) {
  const { state } = runtime;

  if (state.entranceDoneFired) return;
  state.entranceDoneFired = true;

  window.dispatchEvent(new Event("entrance:done"));
  window.setTimeout(() => openEntranceGateFallback(dom, runtime), 30);
}