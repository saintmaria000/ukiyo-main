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

  const rotatePanel = gate.querySelector('[data-gate-panel="rotate"]');
  const languagePanel = gate.querySelector('[data-gate-panel="language"]');
  const langButtons = gate.querySelectorAll(".entrance-gate__link[data-lang]");

  function isCoarsePointer() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function isLandscape() {
    return window.matchMedia("(orientation: landscape)").matches;
  }

  function isSmartphoneLike() {
    const ua = navigator.userAgent || "";
    const mobileUA = /iPhone|Android.+Mobile|iPod|Windows Phone/i.test(ua);
    const smallSide = Math.min(window.innerWidth, window.innerHeight) <= 900;
    return isCoarsePointer() && (mobileUA || smallSide);
  }

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
      if (lang) sessionStorage.setItem(CONFIG.sessionKeyLang, lang);
    } catch (_) {}
  }

  function goToLanguage(lang) {
    const url = lang === "ja" ? CONFIG.jaUrl : CONFIG.enUrl;
    markDone(lang);
    window.location.href = url;
  }

  function setActivePanel(name) {
    if (rotatePanel) {
      rotatePanel.classList.toggle("is-active", name === "rotate");
    }
    if (languagePanel) {
      languagePanel.classList.toggle("is-active", name === "language");
    }
  }

  function updatePanels() {
    if (!isSmartphoneLike()) {
      setActivePanel("language");
      return;
    }

    if (isLandscape()) {
      setActivePanel("language");
    } else {
      setActivePanel("rotate");
    }
  }

  function openGate() {
    gate.classList.add("is-visible");
    gate.setAttribute("aria-hidden", "false");
    updatePanels();
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

    window.addEventListener("resize", updatePanels, { passive: true });
    window.addEventListener("orientationchange", updatePanels, { passive: true });

    window.addEventListener("entrance:done", openGate);
  }

  function init() {
    bind();

    // entrance.js の保険表示で既に開いている場合にも対応
    if (gate.classList.contains("is-visible")) {
      updatePanels();
    }

    // 入口を経由していない通常アクセス時に使いたいならこれを有効化
    if (!shouldSkip() && cameFromEntrance()) {
      openGate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();