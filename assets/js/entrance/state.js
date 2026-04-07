// assets/js/entrance/state.js

import { CONFIG } from "./config.js";

export function createDomRefs() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  return {
    canvas,
    ctx,
    brand: document.querySelector(".brand"),
    revealLogo: document.getElementById("revealLogo"),
    entranceGate: document.getElementById("entranceGate")
  };
}

export function createRuntime() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePortraitQuery = window.matchMedia("(pointer: coarse) and (orientation: portrait)");

  const state = {
    shards: [],
    inflow: [],
    flash: 0,
    revealShown: false,
    entranceDoneFired: false,

    logoTargets: [],
    logoTargetRect: null,

    water: {
      auxDroplets: [],
      metaballMaskCanvas: document.createElement("canvas"),
      metaballMaskCtx: null,
      metaballCompositeCanvas: document.createElement("canvas"),
      metaballCompositeCtx: null
    }
  };

  state.water.metaballMaskCtx = state.water.metaballMaskCanvas.getContext("2d", {
    willReadFrequently: true
  });
  state.water.metaballCompositeCtx = state.water.metaballCompositeCanvas.getContext("2d");

  const viewport = {
    w: 0,
    h: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    cx: 0,
    cy: 0,
    horizonY: 0
  };

  const anim = {
    rafId: 0,
    started: false,
    finished: false,
    startTime: 0,
    lastTs: 0,
    doneTimer: 0
  };

  const P = CONFIG.phase;
  const phaseTimes = {
    P,
    T_HINT: P.hint,
    T_BURST: P.hint + P.burst,
    T_DRIFT: P.hint + P.burst + P.drift,
    T_GATHER: P.hint + P.burst + P.drift + P.gather,
    T_FLASH: P.hint + P.burst + P.drift + P.gather + P.flash,
    T_LOGO: P.hint + P.burst + P.drift + P.gather + P.flash + P.logo
  };

  return {
    motionQuery,
    coarsePortraitQuery,
    state,
    viewport,
    anim,
    phaseTimes
  };
}