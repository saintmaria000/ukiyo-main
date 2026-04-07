// assets/js/entrance/config.js

export const DEFAULT_MOVE_PROFILE = {
  driftForceMul: 1,
  centerBiasMul: 1,
  maxSpeedMul: 1,
  noiseFreqMul: 1,
  wallBounceMul: 1,
  wallDampingMul: 1,
  gravityMul: 1,
  horizonPullMul: 0,
  targetPullMul: 1,
  tangentialMul: 0,
  separationMul: 1
};

export const CONFIG = {
  bg: "#000000",

  horizonYMin: 0.58,
  horizonYMax: 0.62,

  water: {
    background: {
      areaBgColor: "#ff1515",
      areaBgAlpha: 0,
      areaBgSoftAlpha: 0,
      showAreaDebugFill: false,
      showAreaDebugStroke: false,
      areaStrokeColor: "rgba(255,255,255,0.10)"
    },

    area: {
      centerXRatio: 0.5,
      centerYRatio: 0.5,
      mainOffsetY: -54,

      fixedWidth: 500,
      fixedHeight: 400,

      sideInset: 18,
      topInset: 9,
      bottomInset: 20
    },

    main: {
      radius: 82,

      viewportMinScale: 0.74,
      viewportMaxScale: 1.12,
      responsiveBaseWidth: 1440,
      responsiveBaseHeight: 900,

      wobbleAmp: 0.102,
      wobbleSpeedA: 0.92,
      wobbleSpeedB: 1.42,
      rippleAmpA: 0.010,
      rippleAmpB: 0.008
    },

    aux: {
      instances: [
        {
          name: "auxA",
          radius: 34,
          alpha: 0.96,
          spawnPreset: {
            angleDeg: 214,
            distMul: 1.10,
            angleJitterDeg: 14,
            distJitterMul: 0.10
          },
          moveProfile: {
            driftForceMul: 0.92,
            centerBiasMul: 0.12,
            maxSpeedMul: 0.82,
            noiseFreqMul: 0.88,
            wallBounceMul: 0.94,
            wallDampingMul: 1.0,
            gravityMul: 0.26,
            horizonPullMul: 0.12,
            targetPullMul: 0.78,
            tangentialMul: 0.28,
            separationMul: 1.05
          }
        },
        {
          name: "auxB",
          radius: 27,
          alpha: 0.94,
          spawnPreset: {
            angleDeg: 326,
            distMul: 1.20,
            angleJitterDeg: 16,
            distJitterMul: 0.11
          },
          moveProfile: {
            driftForceMul: 0.98,
            centerBiasMul: 0.10,
            maxSpeedMul: 0.88,
            noiseFreqMul: 0.94,
            wallBounceMul: 0.96,
            wallDampingMul: 1.0,
            gravityMul: 0.34,
            horizonPullMul: 0.16,
            targetPullMul: 0.92,
            tangentialMul: 0.36,
            separationMul: 1.14
          }
        },
        {
          name: "auxC",
          radius: 16,
          alpha: 0.92,
          spawnPreset: {
            angleDeg: 46,
            distMul: 1.68,
            angleJitterDeg: 22,
            distJitterMul: 0.15
          },
          moveProfile: {
            driftForceMul: 1.10,
            centerBiasMul: 0.08,
            maxSpeedMul: 1.00,
            noiseFreqMul: 1.08,
            wallBounceMul: 1.0,
            wallDampingMul: 0.99,
            gravityMul: 0.56,
            horizonPullMul: 0.38,
            targetPullMul: 1.04,
            tangentialMul: 0.50,
            separationMul: 1.28
          }
        },
        {
          name: "auxD",
          radius: 11,
          alpha: 0.90,
          spawnPreset: {
            angleDeg: 136,
            distMul: 1.52,
            angleJitterDeg: 24,
            distJitterMul: 0.16
          },
          moveProfile: {
            driftForceMul: 1.18,
            centerBiasMul: 0.06,
            maxSpeedMul: 1.08,
            noiseFreqMul: 1.16,
            wallBounceMul: 1.0,
            wallDampingMul: 0.98,
            gravityMul: 0.62,
            horizonPullMul: 0.46,
            targetPullMul: 1.10,
            tangentialMul: 0.58,
            separationMul: 1.36
          }
        }
      ],

      spawnGapFromMain: {
        auxA: 18,
        auxB: 20,
        auxC: 26,
        auxD: 30
      },

      motion: {
        driftForce: 2.15,
        driftDamping: 0.994,
        driftNoiseX: 2.7,
        driftNoiseY: 2.1,
        maxSpeed: 15.0,
        centerBias: 0.34,
        targetPull: 1.05,
        tangentialForce: 0.55,
        separationForce: 1.28,
        separationRangeMul: 1.9
      },

      wall: {
        wallBounce: 0.76,
        wallDamping: 0.9
      },

      visual: {
        wobbleAmp: 0.11,
        wobbleSpeedA: 1.18,
        wobbleSpeedB: 1.84,

        fillAlphaCenter: 0.14,
        fillAlphaMid: 0.065,
        fillAlphaEdge: 0.018,
        strokeAlphaBase: 0.18
      }
    },

    contact: {
      contactStartMul: 1.78,
      contactFullMul: 1.08
    },

    metaball: {
      joinMul: 1.62,
      threshold: 148,
      blur: 9,
      pad: 28
    },

    halo: {
      radiusRatio: 0.16,
      alphaCore: 0.12,
      alphaMid: 0.05
    },

    waterSurface: {
      lineCount: 10,
      lineSpacing: 8,
      amp: 0.8
    },

    reflection: {
      mainBodyAlpha: 0.12,
      auxBodyAlphaMul: 0.08,
      strokeAlphaMain: 0.055,
      strokeAlphaAux: 0.038,
      squashMain: 0.82,
      squashAux: 0.80,
      squashMetaball: 0.80
    }
  },

  phase: {
    hint: 0.15,
    burst: 1.0,
    drift: 0.5,
    gather: 1.08,
    flash: 0.34,
    logo: 1.28
  },

  logoHoldAfterReveal: 1.42,

  logoMask: {
    fallbackText: "憂き世",
    sampleStep: 4,
    insetRatio: 0.08,
    alphaThreshold: 24
  },

  shardCount: 160,
  shardNearRatio: 0.16,
  shardMidRatio: 0.60,
  shardFarRatio: 0.24,
  gravityInflowCount: 36,

  spreadBoost: 1.9,
  offscreenBoost: 1.45,
  centerRetention: 0.42,
  midRetention: 0.28,

  gatherMaxPull: 2350,
  gatherInflowPull: 2650,
  gatherSteer: 5.4,
  gatherZSteer: 4.0,
  gatherSnapRadius: 30,
  gatherSnapRadiusNear: 38,
  vanishRadius: 5,
  vanishRadiusNear: 7,
  vanishZ: 6,
  vanishZInflow: 12
};