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

module.exports = { commitFile };
