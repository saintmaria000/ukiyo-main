// assets/js/mobile-entry-announce.js
(function () {
  "use strict";

  // =========================
  // 設定
  // =========================
  const CONFIG = {
    jaUrl: "./ja/index.html",
    enUrl: "./en/index.html",

    // true なら「このセッションで一度閉じたら再表示しない」
    oncePerSession: true,

    storageKeyClosed: "ukiyo_mobile_entry_closed",
    storageKeyLang: "ukiyo_mobile_lang"
  };

  // =========================
  // 対象判定
  // =========================
  function isSmartphoneLike() {
    const ua = navigator.userAgent || "";
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 900;

    const mobileUA =
      /iPhone|Android.+Mobile|Windows Phone|iPod/i.test(ua);

    return coarse && (smallScreen || mobileUA);
  }

  function isLandscape() {
    return window.matchMedia("(orientation: landscape)").matches;
  }

  function shouldSkip() {
    if (!isSmartphoneLike()) return true;

    if (CONFIG.oncePerSession) {
      try {
        if (sessionStorage.getItem(CONFIG.storageKeyClosed) === "1") {
          return true;
        }
      } catch (_) {}
    }

    return false;
  }

  // =========================
  // DOM生成
  // =========================
  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "mobile-entry-announce";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Language selection");

    overlay.innerHTML = `
      <div class="mobile-entry-announce__backdrop"></div>
      <div class="mobile-entry-announce__panel">
        <div class="mobile-entry-announce__inner">

          <p class="mobile-entry-announce__lead">Choose Language</p>

          <div class="mobile-entry-announce__lang">
            <button type="button" class="mobile-entry-announce__btn" data-lang="ja">JA</button>
            <button type="button" class="mobile-entry-announce__btn" data-lang="en">EN</button>
          </div>

          <div class="mobile-entry-announce__rotate ${isLandscape() ? "is-hidden" : ""}">
            <div class="mobile-entry-announce__icon" aria-hidden="true">
              <span class="mobile-entry-announce__phone"></span>
            </div>
            <p class="mobile-entry-announce__note">
              For the best experience, please rotate your device horizontally.
            </p>
          </div>

        </div>
      </div>
    `;

    return overlay;
  }

  function injectStyle() {
    if (document.getElementById("mobile-entry-announce-style")) return;

    const style = document.createElement("style");
    style.id = "mobile-entry-announce-style";
    style.textContent = `
      .mobile-entry-announce{
        position:fixed;
        inset:0;
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", sans-serif;
        color:#fff;
      }

      .mobile-entry-announce__backdrop{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,.76);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
      }

      .mobile-entry-announce__panel{
        position:relative;
        width:min(88vw, 420px);
        margin:auto;
      }

      .mobile-entry-announce__inner{
        position:relative;
        padding:24px 22px 22px;
        border:1px solid rgba(255,255,255,.14);
        background:rgba(10,10,10,.88);
        box-shadow:0 18px 50px rgba(0,0,0,.35);
        text-align:center;
      }

      .mobile-entry-announce__lead{
        margin:0 0 18px;
        font-size:.82rem;
        letter-spacing:.24em;
        text-transform:uppercase;
        opacity:.9;
      }

      .mobile-entry-announce__lang{
        display:flex;
        justify-content:center;
        gap:12px;
        margin:0 0 22px;
      }

      .mobile-entry-announce__btn{
        appearance:none;
        border:1px solid rgba(255,255,255,.2);
        background:transparent;
        color:#fff;
        min-width:96px;
        padding:12px 16px;
        font-size:.78rem;
        letter-spacing:.18em;
        text-transform:uppercase;
        cursor:pointer;
        transition:
          background .2s ease,
          border-color .2s ease,
          transform .2s ease,
          opacity .2s ease;
      }

      .mobile-entry-announce__btn:active{
        transform:scale(.98);
      }

      .mobile-entry-announce__btn:hover{
        background:rgba(255,255,255,.08);
        border-color:rgba(255,255,255,.35);
      }

      .mobile-entry-announce__rotate{
        display:grid;
        gap:10px;
        justify-items:center;
        padding-top:6px;
      }

      .mobile-entry-announce__rotate.is-hidden{
        display:none;
      }

      .mobile-entry-announce__icon{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
      }

      .mobile-entry-announce__phone{
        width:16px;
        height:26px;
        border:1.5px solid rgba(255,255,255,.8);
        border-radius:4px;
        position:relative;
        display:block;
        transform:rotate(-90deg);
        opacity:.9;
      }

      .mobile-entry-announce__phone::after{
        content:"";
        position:absolute;
        left:50%;
        bottom:2px;
        width:4px;
        height:4px;
        border-radius:50%;
        background:rgba(255,255,255,.75);
        transform:translateX(-50%);
      }

      .mobile-entry-announce__note{
        margin:0;
        font-size:.68rem;
        line-height:1.6;
        letter-spacing:.08em;
        color:rgba(255,255,255,.78);
      }

      @media (max-width: 380px){
        .mobile-entry-announce__inner{
          padding:22px 16px 18px;
        }

        .mobile-entry-announce__btn{
          min-width:84px;
          padding:11px 12px;
          font-size:.72rem;
        }

        .mobile-entry-announce__note{
          font-size:.64rem;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // =========================
  // 制御
  // =========================
  function updateRotateNotice(root) {
    const note = root.querySelector(".mobile-entry-announce__rotate");
    if (!note) return;

    note.classList.toggle("is-hidden", isLandscape());
  }

  function closeOverlay(root) {
    if (!root) return;

    try {
      if (CONFIG.oncePerSession) {
        sessionStorage.setItem(CONFIG.storageKeyClosed, "1");
      }
    } catch (_) {}

    window.removeEventListener("resize", root.__updateRotateNotice__);
    window.removeEventListener("orientationchange", root.__updateRotateNotice__);

    root.remove();
  }

  function goToLanguage(lang) {
    const url = lang === "ja" ? CONFIG.jaUrl : CONFIG.enUrl;

    try {
      localStorage.setItem(CONFIG.storageKeyLang, lang);
    } catch (_) {}

    window.location.href = url;
  }

  function bind(root) {
    const buttons = root.querySelectorAll("[data-lang]");

    buttons.forEach((btn) => {
      btn.addEventListener("click", function () {
        const lang = this.getAttribute("data-lang");
        closeOverlay(root);
        goToLanguage(lang);
      });
    });

    const onResize = function () {
      updateRotateNotice(root);
    };

    root.__updateRotateNotice__ = onResize;

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
  }

  function init() {
    if (shouldSkip()) return;

    injectStyle();

    const overlay = createOverlay();
    document.body.appendChild(overlay);

    bind(overlay);
    updateRotateNotice(overlay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();