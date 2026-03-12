// assets/js/mobile-entry-announce.js
(function () {
  "use strict";

  const CONFIG = {
    jaUrl: "../ja/index.html",
    enUrl: "../en/english.html",

    // 同一セッション内で一度選んだら再表示しない
    oncePerSession: true,
    sessionKeyDone: "ukiyo_lang_gate_done",
    sessionKeyLang: "ukiyo_lang_gate_lang",

    labels: {
      ja: "JA",
      en: "EN",
      rotateJa: "Please rotate your device horizontally.",
      rotateEn: "横画面にしてお進みください。",
      continue: "Continue"
    }
  };

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

  function shouldSkip() {
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

  function injectStyle() {
    if (document.getElementById("lang-gate-style")) return;

    const style = document.createElement("style");
    style.id = "lang-gate-style";
    style.textContent = `
      .lang-gate {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(0, 0, 0, 0.92);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", sans-serif;
      }

      .lang-gate__inner {
        width: min(88vw, 420px);
        text-align: center;
        padding: 24px 20px;
      }

      .lang-gate__panel {
        display: none;
      }

      .lang-gate__panel.is-active {
        display: block;
      }

      .lang-gate__title {
        margin: 0 0 18px;
        font-size: 0.72rem;
        line-height: 1.8;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.82);
      }

      .lang-gate__links {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        flex-wrap: wrap;
      }

      .lang-gate__link,
      .lang-gate__btn {
        appearance: none;
        border: 0;
        background: transparent;
        color: #fff;
        padding: 0;
        margin: 0;
        font: inherit;
        font-size: 0.95rem;
        line-height: 1.6;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        cursor: pointer;
        opacity: 0.88;
        transition: opacity 0.2s ease;
      }

      .lang-gate__link:hover,
      .lang-gate__btn:hover,
      .lang-gate__link:focus-visible,
      .lang-gate__btn:focus-visible {
        opacity: 1;
        outline: none;
      }

      .lang-gate__sep {
        opacity: 0.35;
        user-select: none;
      }

      .lang-gate__note {
        margin: 0 0 18px;
        font-size: 0.72rem;
        line-height: 1.9;
        letter-spacing: 0.14em;
        color: rgba(255,255,255,0.8);
      }

      .lang-gate__continue {
        margin-top: 8px;
      }

      @media (max-width: 480px) {
        .lang-gate__inner {
          width: min(90vw, 340px);
          padding: 20px 16px;
        }

        .lang-gate__link,
        .lang-gate__btn {
          font-size: 0.88rem;
          letter-spacing: 0.18em;
        }

        .lang-gate__note,
        .lang-gate__title {
          font-size: 0.68rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createGate() {
    const root = document.createElement("div");
    root.className = "lang-gate";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Language selection");

    const mobile = isSmartphoneLike();

    root.innerHTML = `
      <div class="lang-gate__inner">

        <div class="lang-gate__panel ${mobile && !isLandscape() ? "is-active" : ""}" data-panel="rotate">
          <p class="lang-gate__note">
            ${CONFIG.labels.rotateJa}<br>
            ${CONFIG.labels.rotateEn}
          </p>
          <div class="lang-gate__continue">
            <button type="button" class="lang-gate__btn" data-action="continue">
              ${CONFIG.labels.continue}
            </button>
          </div>
        </div>

        <div class="lang-gate__panel ${!mobile || isLandscape() ? "is-active" : ""}" data-panel="lang">
          <p class="lang-gate__title">Language</p>
          <div class="lang-gate__links">
            <button type="button" class="lang-gate__link" data-lang="ja">JA</button>
            <span class="lang-gate__sep">/</span>
            <button type="button" class="lang-gate__link" data-lang="en">EN</button>
          </div>
        </div>

      </div>
    `;

    return root;
  }

  function setActivePanel(root, name) {
    const panels = root.querySelectorAll(".lang-gate__panel");
    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.getAttribute("data-panel") === name);
    });
  }

  function updatePanels(root) {
    if (!isSmartphoneLike()) {
      setActivePanel(root, "lang");
      return;
    }

    if (isLandscape()) {
      setActivePanel(root, "lang");
    } else {
      setActivePanel(root, "rotate");
    }
  }

  function bind(root) {
    root.addEventListener("click", function (event) {
      const langBtn = event.target.closest("[data-lang]");
      if (langBtn) {
        goToLanguage(langBtn.getAttribute("data-lang"));
        return;
      }

      const continueBtn = event.target.closest('[data-action="continue"]');
      if (continueBtn) {
        if (isLandscape()) {
          setActivePanel(root, "lang");
        }
      }
    });

    const onChange = function () {
      updatePanels(root);
    };

    root.__onChange__ = onChange;

    window.addEventListener("resize", onChange, { passive: true });
    window.addEventListener("orientationchange", onChange, { passive: true });
  }

  function init() {
    if (shouldSkip()) return;

    injectStyle();

    const gate = createGate();
    document.body.appendChild(gate);
    bind(gate);
    updatePanels(gate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();