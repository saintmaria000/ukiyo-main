// assets/js/entrance.gate.js
(function () {
  "use strict";

  const CONFIG = {
    jaUrl: "./ja/index.html",
    enUrl: "./en/english.html",

    oncePerSession: true,
    sessionKeyDone: "ukiyo_lang_gate_done",
    sessionKeyLang: "ukiyo_lang_gate_lang",

    // 言語選択表示までの時間
    openDelay: 4000
  };

  const gate = document.getElementById("entranceGate");

  if (!gate) return;

  const langButtons = gate.querySelectorAll(
    ".entrance-gate__link[data-lang]"
  );

  let gateOpened = false;

  function markDone(lang) {

    if (!CONFIG.oncePerSession) return;

    try {

      sessionStorage.setItem(
        CONFIG.sessionKeyDone,
        "1"
      );

      if (lang) {

        sessionStorage.setItem(
          CONFIG.sessionKeyLang,
          lang
        );

      }

    } catch (_) {}

  }

  function goToLanguage(lang) {

    const url =
      lang === "ja"
        ? CONFIG.jaUrl
        : CONFIG.enUrl;

    markDone(lang);

    window.location.href = url;

  }

  function openGate() {

    if (gateOpened) return;

    gateOpened = true;

    gate.classList.add("is-visible");

    gate.setAttribute(
      "aria-hidden",
      "false"
    );

  }

  function closeGate() {

    gate.classList.remove("is-visible");

    gate.setAttribute(
      "aria-hidden",
      "true"
    );

  }

  function bind() {

    // 言語ボタン
    langButtons.forEach((btn) => {

      btn.addEventListener(
        "click",
        function (e) {

          e.preventDefault();
          e.stopPropagation();

          const lang =
            btn.getAttribute("data-lang");

          if (!lang) return;

          closeGate();

          goToLanguage(lang);

        }
      );

    });

    // クリックで即表示
    document.addEventListener(
      "click",
      () => {

        if (!gateOpened) {
          openGate();
        }

      },
      { once: true }
    );

  }

  function init() {

    bind();

    // 自動表示
    setTimeout(() => {

      openGate();

    }, CONFIG.openDelay);

  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );

  } else {

    init();

  }

})();