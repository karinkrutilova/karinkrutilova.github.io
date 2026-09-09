import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const base = '/portfolio/';
const files = await readdir('dist', { recursive: true });
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
await access('dist/admin/config.yml');
const adminConfig = await readFile('dist/admin/config.yml', 'utf8');
assert.match(adminConfig, /asset_collections:\s+[\s\S]*label: Artwork images/);
assert.match(adminConfig, /media_libraries:\s+[\s\S]*slugify_filename: true/);
assert.doesNotMatch(adminConfig, /max_file_size:/, 'Bulk uploads must not be partially rejected by a CMS file-size cap');
console.log(`Checked ${pages.length} pages, local links, responsive images, and admin entry.`);
