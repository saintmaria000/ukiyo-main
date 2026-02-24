const previewImg = document.querySelector(".gallery-preview-img");
const items = document.querySelectorAll(".gallery-item");

items.forEach(item => {
  item.addEventListener("mouseenter", () => {
    const id = item.dataset.id;
    previewImg.src = `/thumbs/${id}.jpg`;
    previewImg.style.opacity = "1";
  });
});