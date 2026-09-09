import { setFrontmatterOrder } from './order-utils.js';

const owner = 'karinkrutilova';
const repo = 'portfolio';
const branch = 'main';
const list = document.querySelector('#artwork-order');
const saveButton = document.querySelector('#save');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');
let draggedItem;
let savedOrder = [...list.children].map((item) => item.dataset.recordPath);

const setStatus = (message) => { status.textContent = message; };

const getSession = () => {
  for (const key of ['sveltia-cms.user', 'decap-cms-user', 'netlify-cms-user']) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value?.backendName === 'github' && typeof value.token === 'string' && value.token) return value;
    } catch {
      // Ignore malformed unrelated browser storage.
    }
  }
  return undefined;
};

const github = async (path, options = {}) => {
  const token = getSession()?.token;
  if (!token) throw new Error('No GitHub session found. Return to the editor, sign in, then open Arrange gallery again.');

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = new Error(data?.message || `GitHub request failed with status ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return data;
};

const getHead = async () => {
  const ref = await github(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const commit = await github(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
  const tree = await github(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha, entries: tree.tree };
};

const decodeBase64 = (content) => {
  const bytes = Uint8Array.from(atob(content.replace(/\s/g, '')), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const loadOrderedRecords = async (paths, entries) => Promise.all(paths.map(async (path, index) => {
  if (!path) throw new Error('An artwork is missing its Artwork details record. Upload it again or create the missing record before arranging.');
  const entry = entries.find((candidate) => candidate.path === path && candidate.type === 'blob');
  if (!entry) throw new Error(`Artwork details record not found: ${path}`);
  const blob = await github(`/repos/${owner}/${repo}/git/blobs/${entry.sha}`);
  return { path, content: setFrontmatterOrder(decodeBase64(blob.content), index + 1) };
}));

const publishOrder = async (paths) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const head = await getHead();
    const records = await loadOrderedRecords(paths, head.entries);
    const tree = await github(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: head.treeSha,
        tree: records.map(({ path, content }) => ({ path, mode: '100644', type: 'blob', content })),
      }),
    });
    const commit = await github(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: `Reorder ${paths.length} portfolio artworks`,
        tree: tree.sha,
        parents: [head.commitSha],
      }),
    });

    try {
      await github(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return commit.sha;
    } catch (error) {
      if (attempt === 3 || ![409, 422].includes(error.status)) throw error;
    }
  }
};

const currentOrder = () => [...list.children].map((item) => item.dataset.recordPath);

const refresh = () => {
  const items = [...list.children];
  items.forEach((item, index) => {
    item.querySelector('.position').textContent = index + 1;
    item.querySelector('[data-move="earlier"]').disabled = index === 0;
    item.querySelector('[data-move="later"]').disabled = index === items.length - 1;
  });
  const changed = currentOrder().some((path, index) => path !== savedOrder[index]);
  saveButton.disabled = !changed;
  resetButton.disabled = !changed;
  if (changed) setStatus('Arrangement changed. Save when it looks right.');
};

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-move]');
  if (!button) return;
  const item = button.closest('.artwork');
  if (button.dataset.move === 'earlier' && item.previousElementSibling) {
    list.insertBefore(item, item.previousElementSibling);
  } else if (button.dataset.move === 'later' && item.nextElementSibling) {
    list.insertBefore(item.nextElementSibling, item);
  }
  refresh();
  button.focus();
});

list.addEventListener('dragstart', (event) => {
  draggedItem = event.target.closest('.artwork');
  if (!draggedItem) return;
  draggedItem.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedItem.dataset.recordPath);
});

list.addEventListener('dragover', (event) => {
  if (!draggedItem) return;
  event.preventDefault();
  const target = event.target.closest('.artwork');
  if (!target || target === draggedItem) return;
  const bounds = target.getBoundingClientRect();
  const after = event.clientY > bounds.top + bounds.height / 2
    || (Math.abs(event.clientY - (bounds.top + bounds.height / 2)) < bounds.height / 4
      && event.clientX > bounds.left + bounds.width / 2);
  list.insertBefore(draggedItem, after ? target.nextElementSibling : target);
  refresh();
});

list.addEventListener('drop', (event) => event.preventDefault());
list.addEventListener('dragend', () => {
  draggedItem?.classList.remove('dragging');
  draggedItem = undefined;
  refresh();
});

resetButton.addEventListener('click', () => {
  const items = new Map([...list.children].map((item) => [item.dataset.recordPath, item]));
  savedOrder.forEach((path) => list.append(items.get(path)));
  refresh();
  setStatus('Restored the last saved site order.');
});

saveButton.addEventListener('click', async () => {
  const paths = currentOrder();
  saveButton.disabled = true;
  resetButton.disabled = true;
  setStatus(`Saving the order of ${paths.length} artworks…`);

  try {
    const commitSha = await publishOrder(paths);
    savedOrder = paths;
    refresh();
    setStatus(`Arrangement saved in commit ${commitSha.slice(0, 7)}. The portfolio is rebuilding and usually updates within two minutes.`);
  } catch (error) {
    setStatus(`Arrangement was not saved. ${error.message}`);
    refresh();
  }
});

refresh();
