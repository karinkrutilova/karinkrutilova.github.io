import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { pickDetailCrops } from '../src/lib/detail-crops.mjs';

// A flat grey image with a fine checkerboard only in the bottom-right quarter: the first crop must land there.
const size = 240, raw = Buffer.alloc(size * size, 40);
for (let y = size / 2; y < size; y++) for (let x = size / 2; x < size; x++) raw[y * size + x] = ((x + y) & 1) * 255;
const file = join(tmpdir(), 'check-crops.png');
await sharp(raw, { raw: { width: size, height: size, channels: 1 } }).png().toFile(file);

const crops = await pickDetailCrops(file);
assert.equal(crops.length, 3, 'expected three crops');
assert(crops[0].x >= 0.5 && crops[0].y >= 0.5, `busiest crop should be bottom-right, got ${JSON.stringify(crops[0])}`);
for (const c of crops) {
  assert(c.x >= 0 && c.y >= 0 && c.x + c.size <= 1.001 && c.y + c.size <= 1.001, `crop outside image: ${JSON.stringify(c)}`);
}
const [a, b] = crops;
assert(Math.abs(a.x - b.x) > a.size / 2 || Math.abs(a.y - b.y) > a.size / 2, 'crops should not pile onto the same spot');
console.log('Detail crops: busiest region found, three spread-out crops inside the image.');
