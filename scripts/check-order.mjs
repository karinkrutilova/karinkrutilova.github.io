import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { setFrontmatterOrder } from '../public/admin/order-utils.js';

const withBody = `---
title: "Example"
image: "/src/assets/works/example.jpg"
order: 18
---

Keep this description, including order: 99 in the body.
`;
const updated = setFrontmatterOrder(withBody, 3);
assert.match(updated, /^order: 3$/m);
assert(!updated.includes('order: 18'));
assert.match(updated, /Keep this description, including order: 99 in the body\./);

const withoutOrder = '---\r\ntitle: "Example"\r\nimage: "/src/assets/works/example.jpg"\r\n---\r\n\r\nDescription.\r\n';
assert.equal(
  setFrontmatterOrder(withoutOrder, 7),
  '---\r\ntitle: "Example"\r\nimage: "/src/assets/works/example.jpg"\r\norder: 7\r\n---\r\n\r\nDescription.\r\n',
);
assert.throws(() => setFrontmatterOrder('No frontmatter', 1), /no valid frontmatter/);

const images = (await readdir('src/assets/works')).filter((name) => /\.(avif|gif|jpe?g|png|webp)$/i.test(name));
let matchedRecords = 0;
for (const image of images) {
  const id = image.replace(/\.[^.]+$/, '');
  const record = await readFile(`src/content/works/${id}.md`, 'utf8').catch(() => '');
  if (record.includes(`/src/assets/works/${image}`)) matchedRecords += 1;
}
console.log(`Gallery ordering: frontmatter and descriptions preserved; ${matchedRecords} of ${images.length} artworks have editable details.`);
