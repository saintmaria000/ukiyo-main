// assets/js/entrance/utils.js

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutCubic(t) {
  t = clamp(t, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

export function easeInExpo(t) {
  t = clamp(t, 0, 1);
  return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}

export function easeOutExpo(t) {
  t = clamp(t, 0, 1);
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutCubic(t) {
  t = clamp(t, 0, 1);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function choose(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export function dist2(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3
    ? value.split("").map((ch) => ch + ch).join("")
    : value;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}