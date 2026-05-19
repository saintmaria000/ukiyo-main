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

    button.addEventListener("click", () => {

      const lang =
        button.getAttribute("data-lang");

      if (lang === "ja") {

        window.location.href =
          "./ja/index.html";

      } else {

        window.location.href =
          "./en/english.html";

      }

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