import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const base = '/portfolio/';
const files = await readdir('dist', { recursive: true });
const artworkFiles = (await readdir('src/assets/works')).filter((file) => /\.(avif|gif|jpe?g|png|webp)$/i.test(file));
const pages = files.filter(file => file.endsWith('.html') && !file.startsWith('admin/'));
assert(pages.includes('index.html') && pages.includes('about/index.html'), 'Missing main pages');
for (const page of pages) {
  const html = await readFile(join('dist', page), 'utf8');
  assert.match(html, /<h1[\s>]/, `${page}: missing heading`);
  for (const [, attr, value] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    if (!value.startsWith('/')) continue;
    assert(value.startsWith(base), `${page}: ${attr} misses GitHub Pages base: ${value}`);
    const path = decodeURIComponent(value.slice(base.length).split(/[?#]/)[0]);
    await access(join('dist', path.endsWith('/') || !path ? `${path}index.html` : path));
  }
  for (const [, tag] of html.matchAll(/(<img\b[^>]*>)/g)) {
    assert.match(tag, /alt="[^"]+"/, `${page}: image has no description`);
    assert.match(tag, /srcset="[^"]+\.webp/, `${page}: responsive WebP missing`);
    assert(!tag.includes('/src/assets/'), `${page}: source image escaped optimization`);
    const srcset = tag.match(/srcset="([^"]+)"/)?.[1];
    for (const candidate of srcset.split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      assert(url.startsWith(`${base}_astro/`), `${page}: invalid responsive image URL`);
      await access(join('dist', decodeURIComponent(url.slice(base.length))));
    }
  }
}
const admin = await readFile('dist/admin/index.html', 'utf8');
assert.match(admin, /@sveltia\/cms@0\.208\.2/);
assert.match(admin, /href="\.\/config\.yml"/);
assert.match(admin, /href="\.\/bulk-upload\/"/);
assert.match(admin, /href="\.\/order\/"/);
await access('dist/admin/config.yml');
await access('dist/admin/bulk-upload/index.html');
await access('dist/admin/order/index.html');
await access('dist/admin/order.js');
await access('dist/admin/order-utils.js');
await access('src/assets/site/.gitkeep');
const bulkUploader = await readFile('dist/admin/bulk-upload/upload.js', 'utf8');
assert.match(bulkUploader, /\/git\/blobs/);
assert.match(bulkUploader, /\/git\/trees/);
assert.match(bulkUploader, /\/git\/commits/);
assert.match(bulkUploader, /\/git\/refs\/heads/);
assert.match(bulkUploader, /src\/content\/works/);
assert.match(bulkUploader, /detailsContent/);
const adminConfig = await readFile('dist/admin/config.yml', 'utf8');
assert.match(adminConfig, /asset_collections:\s+[\s\S]*label: Artwork images/);
assert.match(adminConfig, /media_libraries:\s+[\s\S]*slugify_filename: true/);
assert.doesNotMatch(adminConfig, /max_file_size:/, 'Bulk uploads must not be partially rejected by a CMS file-size cap');
assert.match(adminConfig, /label: Artwork details\n/);
assert.match(adminConfig, /label: Site images/);
assert.match(adminConfig, /name: portrait, label: Portrait photo, widget: image/);
const orderPage = await readFile('dist/admin/order/index.html', 'utf8');
assert.match(orderPage, /id="artwork-order"/);
assert.match(orderPage, /id="save"/);
assert.match(orderPage, /draggable="true"/);
assert.equal([...orderPage.matchAll(/data-record-path="src\/content\/works\/[^\"]+\.md"/g)].length, artworkFiles.length);
const orderScript = await readFile('dist/admin/order.js', 'utf8');
assert.match(orderScript, /Reorder \$\{paths\.length\} portfolio artworks/);
assert.match(orderScript, /\/git\/refs\/heads/);
const home = await readFile('dist/index.html', 'utf8');
assert.match(home, />Karin Krútilová</);
assert.match(home, />Artwork</);
assert.doesNotMatch(home, /See the works/i);
assert.equal([...home.matchAll(/class="work-frame"/g)].length, artworkFiles.length);
const homeSource = await readFile('src/pages/index.astro', 'utf8');
assert.match(homeSource, /getSiteImage\(settings\.portrait\)/);
assert.doesNotMatch(homeSource, /class="hero-work"/);
const globalStyles = await readFile('src/styles/global.css', 'utf8');
assert.match(globalStyles, /\.work-frame\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5[^}]*padding:\s*3px/s);
assert.match(globalStyles, /\.work-frame img\s*\{[^}]*object-fit:\s*cover/s);
console.log(`Checked ${pages.length} pages, local links, responsive images, and admin entry.`);
