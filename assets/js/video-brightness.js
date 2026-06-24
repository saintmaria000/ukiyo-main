(() => {
  const video = document.getElementById("mainVideo");
  const navItems = Array.from(document.querySelectorAll(".edge-btn"));

  if (!(video instanceof HTMLVideoElement) || !navItems.length) return;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true
  });

  if (!context) return;

  canvas.width = 160;
  canvas.height = 90;

  const brightnessState = new WeakMap();
  let lastSampleTime = 0;
  let fallbackTimer = 0;
  let isSamplingAvailable = true;
  let isFrameLoopStarted = false;

  function getRenderedVideoRect() {
    const elementRect = video.getBoundingClientRect();
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight || !elementRect.width || !elementRect.height) {
      return null;
    }

    const sourceRatio = sourceWidth / sourceHeight;
    const elementRatio = elementRect.width / elementRect.height;

    let width = elementRect.width;
    let height = elementRect.height;

    if (sourceRatio > elementRatio) {
      height = width / sourceRatio;
    } else {
      width = height * sourceRatio;
    }

    return {
      left: elementRect.left + (elementRect.width - width) / 2,
      top: elementRect.top + (elementRect.height - height) / 2,
      width,
      height
    };
  }

  function isVisible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number.parseFloat(style.opacity) > 0.05 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight
    );
  }

  function readLuminance(normalizedX, normalizedY) {
    const centerX = Math.round(normalizedX * (canvas.width - 1));
    const centerY = Math.round(normalizedY * (canvas.height - 1));
    const radiusX = 5;
    const radiusY = 4;
    const startX = Math.max(0, centerX - radiusX);
    const startY = Math.max(0, centerY - radiusY);
    const width = Math.min(canvas.width - startX, radiusX * 2 + 1);
    const height = Math.min(canvas.height - startY, radiusY * 2 + 1);
    const pixels = context.getImageData(startX, startY, width, height).data;

    let total = 0;
    let count = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      total +=
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      count += 1;
    }

    return count ? total / count : 0;
  }

  function updateNavColors() {
    if (
      !isSamplingAvailable ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return;
    }

    const renderedVideo = getRenderedVideoRect();
    if (!renderedVideo) return;

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      navItems.forEach((item) => {
        if (!isVisible(item)) {
          item.classList.remove("is-on-bright");
          brightnessState.delete(item);
          return;
        }

        const rect = item.getBoundingClientRect();
        const sampleX = rect.left + rect.width / 2;
        const sampleY = rect.top + rect.height / 2;
        const normalizedX = (sampleX - renderedVideo.left) / renderedVideo.width;
        const normalizedY = (sampleY - renderedVideo.top) / renderedVideo.height;
        const isOverVideo =
          normalizedX >= 0 &&
          normalizedX <= 1 &&
          normalizedY >= 0 &&
          normalizedY <= 1;

        if (!isOverVideo) {
          item.classList.remove("is-on-bright");
          brightnessState.delete(item);
          return;
        }

        const measured = readLuminance(normalizedX, normalizedY);
        const previous = brightnessState.get(item);
        const smoothed =
          previous === undefined
            ? measured
            : previous * 0.72 + measured * 0.28;
        const threshold = item.classList.contains("is-on-bright") ? 145 : 168;

        brightnessState.set(item, smoothed);
        item.classList.toggle("is-on-bright", smoothed >= threshold);
      });
    } catch (error) {
      isSamplingAvailable = false;
      navItems.forEach((item) => item.classList.remove("is-on-bright"));
    }
  }

  function sampleVideoFrame(now = performance.now()) {
    if (now - lastSampleTime >= 100) {
      lastSampleTime = now;
      updateNavColors();
    }

    if (typeof video.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback(sampleVideoFrame);
    }
  }

  function start() {
    updateNavColors();

    if (typeof video.requestVideoFrameCallback === "function") {
      if (isFrameLoopStarted) return;
      isFrameLoopStarted = true;
      video.requestVideoFrameCallback(sampleVideoFrame);
      return;
    }

    window.clearInterval(fallbackTimer);
    fallbackTimer = window.setInterval(updateNavColors, 140);
  }

  video.addEventListener("loadeddata", start, { once: true });
  video.addEventListener("play", start);
  window.addEventListener("resize", updateNavColors, { passive: true });
  window.addEventListener("orientationchange", updateNavColors, { passive: true });

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    start();
  }
})();
