const galleries = document.querySelectorAll('[data-paired-gallery]');

for (const gallery of galleries) {
  const items = [...gallery.children].map((element) => ({
    element,
    ratio: Number(element.dataset.aspectRatio) || 1,
  }));

  let previousWidth = -1;
  let frameRequest = 0;

  const setRowWidths = (row, galleryWidth, columnGap, targetHeight) => {
    const availableWidth = galleryWidth - columnGap * (row.length - 1);
    const ratioTotal = row.reduce((total, item) => total + item.ratio, 0);
    const fittedHeight = availableWidth / ratioTotal;
    const rowHeight = row.length === 2 ? fittedHeight : Math.min(targetHeight, fittedHeight);
    let assignedWidth = 0;

    row.forEach((item, index) => {
      const isFinalPairedItem = row.length === 2 && index === row.length - 1;
      const itemWidth = isFinalPairedItem
        ? availableWidth - assignedWidth
        : item.ratio * rowHeight;

      item.element.style.width = `${itemWidth.toFixed(3)}px`;
      item.element.style.flexBasis = `${itemWidth.toFixed(3)}px`;
      assignedWidth += itemWidth;
    });
  };

  const layout = () => {
    frameRequest = 0;
    const galleryWidth = gallery.getBoundingClientRect().width;
    if (!galleryWidth || galleryWidth === previousWidth) return;
    previousWidth = galleryWidth;

    if (window.matchMedia('(max-width: 620px)').matches) {
      items.forEach(({ element }) => {
        element.style.width = '100%';
        element.style.flexBasis = '100%';
      });
      return;
    }

    const columnGap = Number.parseFloat(getComputedStyle(gallery).columnGap) || 0;
    const targetHeight = Math.min(650, Math.max(420, galleryWidth / 2));
    for (let index = 0; index < items.length; index += 2) {
      setRowWidths(items.slice(index, index + 2), galleryWidth, columnGap, targetHeight);
    }
  };

  const queueLayout = () => {
    if (frameRequest) return;
    frameRequest = requestAnimationFrame(layout);
  };

  if ('ResizeObserver' in window) {
    new ResizeObserver(queueLayout).observe(gallery);
  } else {
    window.addEventListener('resize', queueLayout);
  }

  queueLayout();
}
