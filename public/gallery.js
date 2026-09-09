const galleries = document.querySelectorAll('[data-justified-gallery]');

for (const gallery of galleries) {
  const items = [...gallery.children].map((element) => ({
    element,
    ratio: Number(element.dataset.aspectRatio) || 1,
  }));

  let previousWidth = -1;
  let frameRequest = 0;

  const setRowWidths = (row, galleryWidth, columnGap, targetHeight, justify) => {
    const availableWidth = galleryWidth - columnGap * (row.length - 1);
    const ratioTotal = row.reduce((total, item) => total + item.ratio, 0);
    const fittedHeight = availableWidth / ratioTotal;
    const rowHeight = justify ? fittedHeight : Math.min(targetHeight, fittedHeight);
    let assignedWidth = 0;

    row.forEach((item, index) => {
      const isFinalJustifiedItem = justify && index === row.length - 1;
      const itemWidth = isFinalJustifiedItem
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
    const rows = [];
    let row = [];
    let ratioTotal = 0;

    items.forEach((item) => {
      row.push(item);
      ratioTotal += item.ratio;
      const availableWidth = galleryWidth - columnGap * (row.length - 1);
      const fittedHeight = availableWidth / ratioTotal;

      if (row.length > 1 && fittedHeight <= targetHeight) {
        if (row.length > 2) {
          const previousRatioTotal = ratioTotal - item.ratio;
          const previousWidth = galleryWidth - columnGap * (row.length - 2);
          const previousHeight = previousWidth / previousRatioTotal;
          const previousIsBetter = previousHeight <= targetHeight * 1.2
            && Math.abs(previousHeight - targetHeight) <= Math.abs(fittedHeight - targetHeight);

          if (previousIsBetter) {
            row.pop();
            rows.push({ items: row, justify: true });
            row = [item];
            ratioTotal = item.ratio;
            return;
          }
        }

        rows.push({ items: row, justify: true });
        row = [];
        ratioTotal = 0;
      }
    });

    if (row.length) rows.push({ items: row, justify: false });
    rows.forEach(({ items: rowItems, justify }) => {
      setRowWidths(rowItems, galleryWidth, columnGap, targetHeight, justify);
    });
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
