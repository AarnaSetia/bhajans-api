// Commit a single file to a GitHub repo via the Contents API.
// Used by the `save` Netlify function so the live admin tool can persist
// bhajan JSON straight into the repo (which triggers a Netlify redeploy).

async function ghFetch(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'shcs-bhajans-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
}

/**
 * Create or update a file. Returns the GitHub API response for the commit.
 * @param {object} o
 * @param {string} o.token   GitHub PAT with contents:write on the repo
 * @param {string} o.repo    "owner/name"
 * @param {string} o.branch  e.g. "main"
 * @param {string} o.path    repo-relative path, e.g. "data/bhajans/x/english.json"
 * @param {string} o.content file contents (utf8 string)
 * @param {string} o.message commit message
 */
async function commitFile({ token, repo, branch, path, content, message }) {
  const base = `https://api.github.com/repos/${repo}/contents/${path}`;

  // Look up the existing file's blob SHA (required to update, absent to create).
  let sha;
  const getRes = await ghFetch(`${base}?ref=${encodeURIComponent(branch)}`, token);
  if (getRes.status === 200) {
    sha = (await getRes.json()).sha;
  } else if (getRes.status !== 404) {
    const detail = await getRes.text().catch(() => '');
    throw new Error(`GitHub read failed (${getRes.status}): ${detail.slice(0, 300)}`);
  }

  const putRes = await ghFetch(base, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '');
    throw new Error(`GitHub write failed (${putRes.status}): ${detail.slice(0, 300)}`);
  }
  const body = await putRes.json();
  return {
    updated: Boolean(sha),
    htmlUrl: body?.content?.html_url,
    commitUrl: body?.commit?.html_url,
  };
}

/**
 * Read a text file from the repo. Returns its contents, or null if it doesn't
 * exist (404).
 */
async function getFileText({ token, repo, branch, path }) {
  const res = await ghFetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GitHub read failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const body = await res.json();
  return Buffer.from(body.content, 'base64').toString('utf8');
}

/**
 * Commit several files in a single commit via the Git Data API.
 * @param {object} o
 * @param {Array<{path:string, content:string}>} o.files
 */
async function commitFiles({ token, repo, branch, files, message }) {
  const api = `https://api.github.com/repos/${repo}`;
  const post = (path, payload) =>
    ghFetch(`${api}${path}`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

  const check = async (res, what) => {
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`GitHub ${what} failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    return res.json();
  };

  // 1. Current branch tip.
  const ref = await check(await ghFetch(`${api}/git/ref/heads/${branch}`, token), 'ref lookup');
  const baseSha = ref.object.sha;

  // 2. Its tree.
  const baseCommit = await check(await ghFetch(`${api}/git/commits/${baseSha}`, token), 'commit lookup');
  const baseTree = baseCommit.tree.sha;

  // 3. New tree layered on top (inline text blobs).
  const tree = await check(
    await post('/git/trees', {
      base_tree: baseTree,
      tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
    }),
    'tree create',
  );

  // 4. New commit.
  const commit = await check(
    await post('/git/commits', { message, tree: tree.sha, parents: [baseSha] }),
    'commit create',
  );

  // 5. Move the branch.
  const update = await ghFetch(`${api}/git/refs/heads/${branch}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha }),
  });
  await check(update, 'ref update');

  return { commitSha: commit.sha, commitUrl: commit.html_url };
}

module.exports = { commitFile, getFileText, commitFiles };
