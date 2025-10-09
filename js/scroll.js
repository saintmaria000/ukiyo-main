window.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".body");
  console.log("scroll.js OK?", !!container);

  window.addEventListener("wheel", (e) => {
    console.log("wheel event:", e.deltaY);
  });

  console.log("scrollWidth:", container.scrollWidth, "clientWidth:", container.clientWidth);
});