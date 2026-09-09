import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class FakeElement {
  constructor() {
    this.disabled = false;
    this.files = [];
    this.listeners = {};
    this.textContent = '';
    this.value = '';
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }
}

const filesInput = new FakeElement();
const uploadButton = new FakeElement();
const status = new FakeElement();
const elements = { '#files': filesInput, '#upload': uploadButton, '#status': status };
const requests = [];
let blobNumber = 0;

const response = (data) => ({ ok: true, status: 200, json: async () => data });
const fetch = async (url, options = {}) => {
  const path = new URL(url).pathname;
  const method = options.method ?? 'GET';
  requests.push({ path, method, options });

  if (path.endsWith('/git/ref/heads/main')) return response({ object: { sha: 'base-commit' } });
  if (path.endsWith('/git/commits/base-commit')) return response({ tree: { sha: 'base-tree' } });
  if (path.includes('/git/trees/base-tree') && method === 'GET') return response({ tree: [{ path: 'src/assets/works/one-image.jpg' }] });
  if (path.endsWith('/git/blobs')) return response({ sha: `blob-${++blobNumber}` });
  if (path.endsWith('/git/trees')) return response({ sha: 'new-tree' });
  if (path.endsWith('/git/commits')) return response({ sha: 'new-commit' });
  if (path.endsWith('/git/refs/heads/main')) return response({ object: { sha: 'new-commit' } });
  throw new Error(`Unexpected request: ${method} ${path}`);
};

class FakeFileReader {
  readAsDataURL(file) {
    this.result = `data:${file.type};base64,dGVzdA==`;
    queueMicrotask(() => this.onload());
  }
}

const code = await readFile('public/admin/bulk-upload/upload.js', 'utf8');
vm.runInNewContext(code, {
  document: { querySelector: (selector) => elements[selector] },
  localStorage: { getItem: (key) => key === 'sveltia-cms.user' ? JSON.stringify({ backendName: 'github', token: 'test-secret' }) : null },
  fetch,
  FileReader: FakeFileReader,
  Intl,
  URL,
  Set,
  Promise,
  JSON,
  queueMicrotask,
});

filesInput.files = [
  { name: 'One Image.JPG', size: 4, type: 'image/jpeg' },
  { name: 'One_Image.jpg', size: 4, type: 'image/jpeg' },
];
filesInput.listeners.change();
await uploadButton.listeners.click();

const blobRequests = requests.filter(({ path, method }) => path.endsWith('/git/blobs') && method === 'POST');
assert.equal(blobRequests.length, 2, 'each image should be uploaded independently');
const treeRequest = requests.find(({ path, method }) => path.endsWith('/git/trees') && method === 'POST');
const tree = JSON.parse(treeRequest.options.body).tree;
assert.deepEqual(tree.map(({ path }) => path), [
  'src/assets/works/one-image-2.jpg',
  'src/content/works/one-image-2.md',
  'src/assets/works/one-image-3.jpg',
  'src/content/works/one-image-3.md',
]);
const details = tree.filter(({ path }) => path.startsWith('src/content/works/'));
assert.equal(details.length, 2, 'each image should get an Artwork details entry');
assert.match(details[0].content, /title: "One Image 2"/);
assert.match(details[0].content, /image: "\/src\/assets\/works\/one-image-2\.jpg"/);
assert.match(details[0].content, /imageAlt: "One Image 2"/);
assert.match(details[0].content, /featured: false/);
assert.equal(requests.filter(({ path, method }) => path.endsWith('/git/commits') && method === 'POST').length, 1);
assert.equal(requests.filter(({ path, method }) => path.endsWith('/git/refs/heads/main') && method === 'PATCH').length, 1);
assert(requests.every(({ options }) => options.headers?.Authorization === 'Bearer test-secret'));
assert.match(status.textContent, /Uploaded 2 of 2 images successfully/);
assert.match(status.textContent, /Created 2 matching Artwork details entries/);
assert(!status.textContent.includes('test-secret'), 'token must never be displayed');
console.log('Bulk uploader: independent blobs, matching detail entries, safe filenames, one commit, and no token exposure.');
