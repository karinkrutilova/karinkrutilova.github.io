(() => {
  'use strict';

  const owner = 'karinkrutilova';
  const repo = 'karinkrutilova.github.io';
  const branch = 'main';
  const assetDirectory = 'src/assets/works';
  const detailsDirectory = 'src/content/works';
  const maxFileSize = 100 * 1024 * 1024;
  const allowedExtensions = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
  const filesInput = document.querySelector('#files');
  const uploadButton = document.querySelector('#upload');
  const status = document.querySelector('#status');

  const setStatus = (message) => { status.textContent = message; };
  const formatSize = (bytes) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + ' MB';

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
    if (!token) throw new Error('No GitHub session found. Return to the editor, sign in, then open Bulk upload images again.');

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
    return { commitSha: ref.object.sha, treeSha: commit.tree.sha, paths: tree.tree.map(({ path }) => path) };
  };

  const safeFileName = (originalName, usedPaths) => {
    const dot = originalName.lastIndexOf('.');
    const extension = dot > 0 ? originalName.slice(dot + 1).toLowerCase() : '';
    if (!allowedExtensions.has(extension)) throw new Error('Unsupported image format.');

    const stem = (dot > 0 ? originalName.slice(0, dot) : originalName)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled';
    let suffix = 1;
    let name = `${stem}.${extension}`;
    let path = `${assetDirectory}/${name}`;
    let detailsPath = `${detailsDirectory}/${stem}.md`;

    while (usedPaths.has(path.toLowerCase()) || usedPaths.has(detailsPath.toLowerCase())) {
      suffix += 1;
      name = `${stem}-${suffix}.${extension}`;
      path = `${assetDirectory}/${name}`;
      detailsPath = `${detailsDirectory}/${stem}-${suffix}.md`;
    }
    usedPaths.add(path.toLowerCase());
    usedPaths.add(detailsPath.toLowerCase());
    return { name, path, detailsPath };
  };

  const titleFromName = (name) => {
    const stem = name.replace(/\.[^.]+$/, '');
    const title = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return title ? title.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Untitled';
  };

  const detailsContent = ({ name, path }) => {
    const title = titleFromName(name);
    return [
      '---',
      `title: ${JSON.stringify(title)}`,
      `image: ${JSON.stringify(`/${path}`)}`,
      `imageAlt: ${JSON.stringify(title)}`,
      'tags: []',
      'featured: false',
      '---',
      '',
    ].join('\n');
  };

  const encodeFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The browser could not read this file.'));
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1]);
    reader.readAsDataURL(file);
  });

  const uploadBlobs = async (preparedFiles) => {
    const successes = [];
    const failures = [];
    let cursor = 0;
    let completed = 0;

    const worker = async () => {
      while (cursor < preparedFiles.length) {
        const item = preparedFiles[cursor++];
        try {
          const content = await encodeFile(item.file);
          const blob = await github(`/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content, encoding: 'base64' }),
          });
          successes.push({ ...item, sha: blob.sha });
        } catch (error) {
          failures.push({ ...item, error: error.message });
        } finally {
          completed += 1;
          setStatus(`Uploading file data: ${completed}/${preparedFiles.length}\nSuccessful: ${successes.length}\nFailed: ${failures.length}`);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(2, preparedFiles.length) }, worker));
    return { successes, failures };
  };

  const publish = async (files) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const head = await getHead();
      const tree = await github(`/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
          base_tree: head.treeSha,
          tree: files.flatMap((file) => [
            { path: file.path, mode: '100644', type: 'blob', sha: file.sha },
            { path: file.detailsPath, mode: '100644', type: 'blob', content: detailsContent(file) },
          ]),
        }),
      });
      const commit = await github(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: `Bulk upload ${files.length} artwork image${files.length === 1 ? '' : 's'} and details`,
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

  filesInput.addEventListener('change', () => {
    const files = [...filesInput.files];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    uploadButton.disabled = files.length === 0;
    setStatus(files.length ? `${files.length} image${files.length === 1 ? '' : 's'} selected (${formatSize(totalSize)} total).` : 'Choose images to begin.');
  });

  uploadButton.addEventListener('click', async () => {
    const selectedFiles = [...filesInput.files];
    if (!selectedFiles.length) return;

    uploadButton.disabled = true;
    filesInput.disabled = true;

    try {
      setStatus('Checking the repository…');
      const head = await getHead();
      const usedPaths = new Set(head.paths.map((path) => path.toLowerCase()));
      const preparedFiles = [];
      const failures = [];

      selectedFiles.forEach((file, index) => {
        try {
          if (file.size > maxFileSize) throw new Error(`File exceeds GitHub’s 100 MB limit (${formatSize(file.size)}).`);
          preparedFiles.push({ file, index, ...safeFileName(file.name, usedPaths) });
        } catch (error) {
          failures.push({ file, index, error: error.message });
        }
      });

      if (!preparedFiles.length) throw new Error(failures.map(({ file, error }) => `${file.name}: ${error}`).join('\n'));

      const uploaded = await uploadBlobs(preparedFiles);
      failures.push(...uploaded.failures);
      if (!uploaded.successes.length) throw new Error(failures.map(({ file, error }) => `${file.name}: ${error}`).join('\n'));

      setStatus(`Publishing ${uploaded.successes.length} image${uploaded.successes.length === 1 ? '' : 's'} in one commit…`);
      const commitSha = await publish(uploaded.successes);
      const failureLines = failures.sort((a, b) => a.index - b.index).map(({ file, error }) => `- ${file.name}: ${error}`);

      setStatus([
        `Uploaded ${uploaded.successes.length} of ${selectedFiles.length} images successfully.`,
        `Created ${uploaded.successes.length} matching Artwork details ${uploaded.successes.length === 1 ? 'entry' : 'entries'}.`,
        `Commit: ${commitSha.slice(0, 7)}`,
        failureLines.length ? `\nFiles not uploaded:\n${failureLines.join('\n')}` : '\nAll selected images were uploaded.',
      ].join('\n'));
      filesInput.value = '';
    } catch (error) {
      setStatus(`Nothing was published.\n${error.message}`);
    } finally {
      filesInput.disabled = false;
      uploadButton.disabled = filesInput.files.length === 0;
    }
  });
})();
