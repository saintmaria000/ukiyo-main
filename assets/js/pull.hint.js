// assets/js/pull.hint.js

(() => {

  const body = document.body;
  const stage = document.getElementById("top");

  if (!stage) return;

  let timer = null;
  let startY = 0;
  let tracking = false;

  function isCenterView() {
    return body.classList.contains("view-center");
  }

  function isTop() {
    return window.scrollY <= 4;
  }

  function showPull(duration = 3000) {

    body.classList.add("is-pull-hint-visible");

    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      body.classList.remove("is-pull-hint-visible");
      timer = null;
    }, duration);
  }

  function hidePull() {

    if (timer) clearTimeout(timer);

    timer = null;

    body.classList.remove("is-pull-hint-visible");
  }

  /* ---------------------------------
     About → Back to Main
  --------------------------------- */

  document.addEventListener("click", (e) => {

    const btn = e.target.closest('[data-show-pull="true"]');

    if (!btn) return;

    // view.js が scrollTo するので少し待つ
    setTimeout(() => {

      if (isCenterView() && isTop()) {
        showPull(3000);
      }

    }, 500);

  });


  /* ---------------------------------
     TOPでのPull検知
  --------------------------------- */

  document.addEventListener("touchstart", (e) => {

    if (!stage.contains(e.target)) return;
    if (!isCenterView()) return;
    if (!isTop()) return;

    startY = e.touches[0].clientY;
    tracking = true;

  }, { passive: true });


  document.addEventListener("touchmove", (e) => {

    if (!tracking) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - startY;

    if (delta > 28) {

      showPull(1200);
      tracking = false;

    }

  }, { passive: true });


  document.addEventListener("touchend", () => {
    tracking = false;
  }, { passive: true });


  document.addEventListener("touchcancel", () => {
    tracking = false;
  }, { passive: true });


  /* ---------------------------------
     下にスクロールしたら消す
  --------------------------------- */

  window.addEventListener("scroll", () => {

    if (!isTop()) hidePull();

  }, { passive: true });

})();