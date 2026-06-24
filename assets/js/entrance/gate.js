// assets/js/entrance/gate.js

export function openEntranceGateFallback(dom, runtime) {

  const { entranceGate } = dom;

  if (!entranceGate) return;

  entranceGate.classList.add("is-visible");

  entranceGate.setAttribute(
    "aria-hidden",
    "false"
  );

  const languagePanel =
    entranceGate.querySelector(
      '[data-gate-panel="language"]'
    );

  if (languagePanel) {

    languagePanel.classList.add(
      "is-active"
    );

  }

  // 言語ボタン遷移
  const buttons =
    entranceGate.querySelectorAll(
      ".entrance-gate__link[data-lang]"
    );

  buttons.forEach((button) => {
    if (button.dataset.entranceBound === "true") return;
    button.dataset.entranceBound = "true";

    button.addEventListener("click", () => {

      const lang =
        button.getAttribute("data-lang");

      const destination =
        lang === "en"
          ? "./en/index.html"
          : "./ja/index.html";

      window.location.assign(destination);

    });

  });

}

export function fireEntranceDone(dom, runtime) {

  const { state } = runtime;

  if (state.entranceDoneFired) return;

  state.entranceDoneFired = true;

  window.dispatchEvent(
    new Event("entrance:done")
  );

  window.setTimeout(
    () => openEntranceGateFallback(dom, runtime),
    30
  );

}
