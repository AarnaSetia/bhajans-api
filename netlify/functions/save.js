// Netlify function — persists a bhajan file on the LIVE site by committing it to
// GitHub (which triggers a Netlify redeploy). Gated by Firebase auth so only
// signed-in admins can write to the repo.
//
// Required env var:  GITHUB_TOKEN  (PAT with contents:write on the repo)
// Optional env vars: GITHUB_REPO   (default "AarnaSetia/bhajans-api")
//                    GITHUB_BRANCH (default "main")
//                    FIREBASE_API_KEY (defaults to the public web key)

const { getFileText, commitFiles } = require('../../lib/github');
const { verifyIdToken } = require('../../lib/firebase-verify');
const { upsertCatalogEntry } = require('../../lib/catalog');

const SLUG = /^[a-z0-9-]+$/i;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // 1. Require a valid Firebase login.
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const user = await verifyIdToken(idToken);
  if (!user) {
    return json(401, { error: 'Not signed in. Please log in again and retry.' });
  }

  try {
    const { id, lang, langLabel, displayTitle, data } = JSON.parse(event.body || '{}');
    if (!id || !lang || !data) return json(400, { error: 'id, lang and data are required.' });
    if (!SLUG.test(id) || !SLUG.test(lang)) {
      return json(400, { error: 'id and lang may only contain letters, numbers and hyphens.' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) return json(500, { error: 'GITHUB_TOKEN is not configured on the server.' });

    const repo = process.env.GITHUB_REPO || 'AarnaSetia/bhajans-api';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const lyricsPath = `data/bhajans/${id}/${lang}.json`;
    const catalogPath = 'data/catalog.json';

    // Read + merge the catalog so the bhajan/language shows up in the app.
    let catalog = [];
    const rawCatalog = await getFileText({ token, repo, branch, path: catalogPath });
    if (rawCatalog) {
      try {
        catalog = JSON.parse(rawCatalog);
      } catch {
        return json(500, { error: 'catalog.json in the repo is not valid JSON — fix it before saving.' });
      }
    }
    const { created, languageAdded } = upsertCatalogEntry(catalog, {
      id, displayTitle, langKey: lang, langLabel,
    });

    const by = user.email || user.localId || 'admin';
    const result = await commitFiles({
      token,
      repo,
      branch,
      message: `${created ? 'Add' : 'Update'} ${id}/${lang} + catalog via admin (${by})`,
      files: [
        { path: lyricsPath, content: JSON.stringify(data, null, 2) + '\n' },
        { path: catalogPath, content: JSON.stringify(catalog, null, 2) + '\n' },
      ],
    });

    return json(200, {
      ok: true,
      committed: true,
      path: lyricsPath,
      created,
      languageAdded,
      catalogUpdated: created || languageAdded,
      commitUrl: result.commitUrl,
    });
  } catch (err) {
    return json(500, { error: err.message });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
