document.querySelector('.body').addEventListener('wheel', e => {
  e.preventDefault();
  e.currentTarget.scrollLeft += e.deltaY;
});