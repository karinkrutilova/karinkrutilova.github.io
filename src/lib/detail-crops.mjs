// Picks the busiest square regions of an image, measured by edge density, for the "Details" close-ups.
import sharp from 'sharp';

/**
 * @param {string} file  path to the image
 * @param {{ count?: number, size?: number }} [options]  size = crop side as a fraction of the shorter edge
 * @returns {Promise<Array<{ x: number, y: number, size: number }>>}  top-left and side, all as fractions of the image width
 */
export async function pickDetailCrops(file, { count = 3, size = 0.3 } = {}) {
  const { data, info } = await sharp(file).resize({ width: 320 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Edge energy per pixel, then an integral image so any window sums in O(1).
  const sums = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y < h - 1; y++) {
    let row = 0;
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      row += Math.abs(data[i + 1] - data[i - 1]) + Math.abs(data[i + w] - data[i - w]);
      sums[(y + 1) * (w + 1) + x + 1] = sums[y * (w + 1) + x + 1] + row;
    }
    sums[(y + 1) * (w + 1) + w] = sums[y * (w + 1) + w] + row;
  }
  const energy = (x0, y0, x1, y1) => sums[y1 * (w + 1) + x1] - sums[y0 * (w + 1) + x1] - sums[y1 * (w + 1) + x0] + sums[y0 * (w + 1) + x0];

  const side = Math.round(Math.min(w, h) * size);
  const step = Math.max(1, Math.round(side / 8));
  const candidates = [];
  for (let y = 0; y + side <= h; y += step) for (let x = 0; x + side <= w; x += step) candidates.push({ x, y, score: energy(x, y, x + side, y + side) });
  candidates.sort((a, b) => b.score - a.score);

  const picked = [];
  for (const c of candidates) {
    if (picked.length === count) break;
    // ponytail: greedy pick, skipping anything that overlaps a previous pick by more than a third on both axes
    if (picked.every(p => Math.abs(p.x - c.x) >= side * 0.67 || Math.abs(p.y - c.y) >= side * 0.67)) picked.push(c);
  }
  return picked.map(p => ({ x: p.x / w, y: p.y / w, size: side / w }));
}

/** Inline style that shows one crop inside a square `.crop` box. */
export const cropStyle = c => `width:${(100 / c.size).toFixed(2)}%;left:${(-100 * c.x / c.size).toFixed(2)}%;top:${(-100 * c.y / c.size).toFixed(2)}%`;
