// assets/js/entrance/index.js

import { CONFIG } from "./config.js";
import { clamp, easeOutCubic } from "./utils.js";
import { createDomRefs, createRuntime } from "./state.js";
import { resize } from "./layout.js";
import {
  prepareLogos,
  buildLogoTargetPoints,
  setBrandOpacity,
  setRevealOpacity,
  showRevealLogo
} from "./logo.js";
import { createShardField, updateShards, drawShards } from "./shards.js";
import { initWaterDroplets, updateWaterDroplets, drawWaterDropletSystem } from "./water.js";
import { drawBackground, drawReflection, drawCompressionFlash } from "./background.js";
import { openEntranceGateFallback, fireEntranceDone } from "./gate.js";
import { getPhase } from "./timeline.js";

(() => {
  "use strict";

  const dom = createDomRefs();
  if (!dom) return;

  const runtime = createRuntime();
  const { state, anim, motionQuery, coarsePortraitQuery, phaseTimes } = runtime;

  function render(ts) {
    const now = ts * 0.001;

    if (!anim.lastTs) anim.lastTs = now;
    const dt = Math.min(now - anim.lastTs, 0.033);
    anim.lastTs = now;

    const t = clamp(now - anim.startTime, 0, 99);
    const phase = getPhase(phaseTimes, t);

    drawBackground(dom, runtime, now, phase, t);

    const hintK = phase === "hint" ? easeOutCubic(t / phaseTimes.P.hint) : 0;

    if (!anim.started) {
      updateWaterDroplets(runtime, dt, now);
      setBrandOpacity(dom, 1);
      setRevealOpacity(dom, 0);
      drawReflection(dom, runtime, now, 0);
      drawWaterDropletSystem(dom, runtime, now, 0);
      anim.rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "hint") {
      setBrandOpacity(dom, 1 - hintK * 0.38);
      setRevealOpacity(dom, 0);
      drawReflection(dom, runtime, now, hintK);
      drawWaterDropletSystem(dom, runtime, now, hintK);
      anim.rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "burst" || phase === "drift" || phase === "gather") {
      if (phase === "burst") {
        const burstK = clamp((t - phaseTimes.T_HINT) / phaseTimes.P.burst, 0, 1);
        setBrandOpacity(dom, 1 - easeOutCubic(burstK));

        if (dom.brand) {
          const spread = 1 + burstK * 0.035;
          dom.brand.style.transform = `translate(-50%, -50%) scale(${spread})`;
        }
      } else {
        setBrandOpacity(dom, 0);
      }

      setRevealOpacity(dom, 0);
      updateShards(runtime, dt, t);
      drawShards(dom, runtime, t);

      anim.rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "flash") {
      setBrandOpacity(dom, 0);
      setRevealOpacity(dom, 0);
      updateShards(runtime, dt, t);
      drawShards(dom, runtime, t);
      state.flash = 1 - clamp((t - phaseTimes.T_GATHER) / phaseTimes.P.flash, 0, 1);
      drawCompressionFlash(dom, runtime, phase, t);

      anim.rafId = requestAnimationFrame(render);
      return;
    }

    if (phase === "logo" || phase === "done") {
      setBrandOpacity(dom, 0);
      updateShards(runtime, dt, t);
      state.flash = 0;

      if (!state.revealShown) {
        state.revealShown = true;
        showRevealLogo(dom);
      }

      const rawLogoK = clamp((t - phaseTimes.T_FLASH) / phaseTimes.P.logo, 0, 1);
      const logoK = clamp((rawLogoK - 0.18) / 0.82, 0, 1);
      setRevealOpacity(dom, logoK);

      if (phase === "done" && !anim.finished) {
        anim.finished = true;
        anim.doneTimer = window.setTimeout(() => {
          fireEntranceDone(dom, runtime);
        }, CONFIG.logoHoldAfterReveal * 1000);
      }

      anim.rafId = requestAnimationFrame(render);
    }
  }

  function startEntrance() {
    if (anim.started) return;

    document.body.classList.add("is-transitioning");

    anim.started = true;
    anim.finished = false;
    anim.startTime = performance.now() * 0.001;
    anim.lastTs = 0;
  }

  function handleTrigger(e) {
    if (anim.started) return;

    if (e.type === "keydown") {
      const valid =
        e.key === "Enter" ||
        e.key === " " ||
        e.code === "Space" ||
        e.key === "Spacebar";
      if (!valid) return;
      e.preventDefault();
    }

    if (e.cancelable) e.preventDefault();
    startEntrance();
  }

  function rebuildIdleWorld() {
    if (anim.started) return;
    prepareLogos(dom);
    resize(dom, runtime);
    buildLogoTargetPoints(dom, runtime);
    createShardField(runtime);
    initWaterDroplets(runtime);
  }

  function boot() {
    window.clearTimeout(anim.doneTimer);
    anim.doneTimer = 0;

    anim.started = false;
    anim.finished = false;
    anim.startTime = 0;
    anim.lastTs = 0;

    state.flash = 0;
    state.revealShown = false;
    state.entranceDoneFired = false;

    rebuildIdleWorld();

    if (motionQuery.matches) {
      setBrandOpacity(dom, 1);
      setRevealOpacity(dom, 0);
    }

    cancelAnimationFrame(anim.rafId);
    anim.rafId = requestAnimationFrame(render);
  }

  window.addEventListener("resize", rebuildIdleWorld, { passive: true });
  window.addEventListener("pointerdown", handleTrigger, { passive: false });
  window.addEventListener("keydown", handleTrigger);

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", boot);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(boot);
  }

  if (coarsePortraitQuery.addEventListener) {
    coarsePortraitQuery.addEventListener("change", () => {
      if (state.entranceDoneFired) openEntranceGateFallback(dom, runtime);
    });
  } else if (coarsePortraitQuery.addListener) {
    coarsePortraitQuery.addListener(() => {
      if (state.entranceDoneFired) openEntranceGateFallback(dom, runtime);
    });
  }

  boot();
})();