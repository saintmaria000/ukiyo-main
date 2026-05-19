// assets/js/entrance.gate.js
(function () {
  "use strict";

  const CONFIG = {
    jaUrl: "./ja/index.html",
    enUrl: "./en/english.html",

    oncePerSession: true,
    sessionKeyDone: "ukiyo_lang_gate_done",
    sessionKeyLang: "ukiyo_lang_gate_lang",

    entranceQueryKey: "from",
    entranceQueryValue: "entrance"
  };

  const gate = document.getElementById("entranceGate");
  if (!gate) return;

  const langButtons = gate.querySelectorAll(".entrance-gate__link[data-lang]");

  function cameFromEntrance() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(CONFIG.entranceQueryKey) === CONFIG.entranceQueryValue;
    } catch (_) {
      return false;
    }
  }

  function cleanEntranceQuery() {
    try {
      const url = new URL(window.location.href);

      if (url.searchParams.get(CONFIG.entranceQueryKey) !== CONFIG.entranceQueryValue) return;

      url.searchParams.delete(CONFIG.entranceQueryKey);

      const nextUrl = url.pathname + url.search + url.hash;

      window.history.replaceState({}, "", nextUrl);

    } catch (_) {}
  }

  function shouldSkip() {
    if (cameFromEntrance()) return false;
    if (!CONFIG.oncePerSession) return false;

    try {
      return sessionStorage.getItem(CONFIG.sessionKeyDone) === "1";
    } catch (_) {
      return false;
    }
  }

  function markDone(lang) {
    if (!CONFIG.oncePerSession) return;

    try {
      sessionStorage.setItem(CONFIG.sessionKeyDone, "1");

      if (lang) {
        sessionStorage.setItem(CONFIG.sessionKeyLang, lang);
      }

    } catch (_) {}
  }

  function goToLanguage(lang) {
    const url = lang === "ja"
      ? CONFIG.jaUrl
      : CONFIG.enUrl;

    markDone(lang);

    window.location.href = url;
  }

  function openGate() {
    gate.classList.add("is-visible");
    gate.setAttribute("aria-hidden", "false");

    cleanEntranceQuery();
  }

  function closeGate() {
    gate.classList.remove("is-visible");
    gate.setAttribute("aria-hidden", "true");
  }

  function bind() {

    langButtons.forEach((btn) => {

      btn.addEventListener("click", function (e) {

        e.preventDefault();
        e.stopPropagation();

        const lang = btn.getAttribute("data-lang");

        if (!lang) return;

        closeGate();

        goToLanguage(lang);

      });

    });

    window.addEventListener("entrance:done", openGate);

  }

  function init() {

    bind();

    if (!shouldSkip() && cameFromEntrance()) {
      openGate();
    }

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