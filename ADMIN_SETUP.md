# SHCS Bhajans — Admin UI setup

The admin tool lets an authenticated user upload bhajan lyrics as a `.txt`
(Gemini formats it into the app's JSON schema) or a `.json` (Gemini validates
it), then saves the result to `data/bhajans/<id>/<language>.json`.

- **Login page + dashboard:** `data/admin/` → served at `/admin/`
- **Gemini logic:** `lib/gemini.js` (shared by the function and the dev server)
- **Secure key proxy (live):** `netlify/functions/gemini.js`
- **Local dev endpoints:** `server.js` (`/api/gemini`, `/api/save`)

The existing API (`/catalog.json`, `/bhajans/:id/:lang.json`, `/audio/:id.mp3`)
is **unchanged** — the mobile app keeps working exactly as before.

---

## 1. Firebase (login)

1. Firebase console → **Authentication → Sign-in method → enable Email/Password**.
2. Add your admin users under **Authentication → Users**.
3. Copy your web config (Project settings → Your apps → SDK setup) into
   [`data/admin/firebase-config.js`](data/admin/firebase-config.js), replacing
   the `YOUR_...` placeholders.

Firebase web config is **not** secret — it's designed to live in the browser.

## 2. Gemini API key (formatting / validation)

The key is **secret** and never ships to the browser.

- **Live (Netlify):** Site settings → **Environment variables** → add
  `GEMINI_API_KEY`. (Optional `GEMINI_MODEL`, default `gemini-2.5-flash`.)
- **Local dev:** `cp .env.example .env` and paste your key into `.env`.

Netlify Functions are free at this volume (125k calls / 100 hrs per month), so
running the proxy costs nothing for admin use.

## 3. Run locally

```bash
npm install
npm run dev          # http://localhost:3000/admin/
```

Locally, **Save** writes straight to `data/bhajans/<id>/<language>.json`.

## 4. Deploy

Push to the repo linked to Netlify. Note: a deployed **static** site can't write
back into its own repo, so on the live site **Save** falls back to downloading
the file for you to commit. The intended flow is to prepare files locally (where
Save writes to disk), then push. (A future enhancement could commit directly via
the GitHub API.)

## Notes

- To make a new bhajan appear in the app, its `id` must also be added to
  [`data/catalog.json`](data/catalog.json) with the language list. The admin tool
  writes the per-language lyrics file; the catalog entry is still edited by hand.
- Stanza types: `verse`, `doha`, `dhyanam`, `chaupai`. Only `verse`/`chaupai`
  carry a `number`.
