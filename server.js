const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { runGemini } = require('./lib/gemini');

// ── Minimal .env loader (no dependency) ──────────────────────────
// Loads KEY=VALUE lines from ./.env into process.env if the file exists.
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
})();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const DATA_DIR = path.join(__dirname, 'data');

// ── Admin API (local dev only; on Netlify these are functions) ───

// Gemini proxy — mirrors /.netlify/functions/gemini
app.post('/api/gemini', async (req, res) => {
  try {
    const { mode, text, id, title, lang } = req.body || {};
    const out = await runGemini({
      mode, text, id, title, lang,
      apiKey: process.env.GEMINI_API_KEY,
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a formatted/validated bhajan to data/bhajans/<id>/<lang>.json
app.post('/api/save', (req, res) => {
  try {
    const { id, lang, data } = req.body || {};
    if (!id || !lang || !data) {
      return res.status(400).json({ error: 'id, lang and data are required.' });
    }
    // Guard against path traversal in id / lang.
    const safe = (s) => /^[a-z0-9-]+$/i.test(s);
    if (!safe(id) || !safe(lang)) {
      return res.status(400).json({ error: 'id and lang may only contain letters, numbers and hyphens.' });
    }
    const dir = path.join(DATA_DIR, 'bhajans', id);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${lang}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    res.json({ ok: true, path: `data/bhajans/${id}/${lang}.json` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Static bhajan data (catalog + lyrics + audio + admin UI) ─────
app.use(express.static(DATA_DIR, {
  setHeaders(res, filePath) {
    // Admin UI must always revalidate; bhajan data can cache for an hour.
    if (filePath.includes(`${path.sep}admin${path.sep}`)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bhajans API running on http://localhost:${PORT}`);
  console.log(`  Catalog: http://localhost:${PORT}/catalog.json`);
  console.log(`  Lyrics:  http://localhost:${PORT}/bhajans/:id/:lang.json`);
  console.log(`  Admin:   http://localhost:${PORT}/admin/`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('  ⚠ GEMINI_API_KEY not set — add it to .env to enable formatting.');
  }
});
