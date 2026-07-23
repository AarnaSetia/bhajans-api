// SHCS Bhajans Admin — front-end logic.
// Firebase Email/Password auth gates the dashboard. Uploaded files are sent to
// the secure Gemini proxy (/api/gemini) for formatting/validation, then saved to
// data/bhajans/<id>/<lang>.json (local dev) or downloaded (live site).

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ── Element handles ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const loginView = $('login-view');
const appView = $('app-view');
const loginForm = $('login-form');
const loginError = $('login-error');
const configWarning = $('config-warning');

// ── Auth ─────────────────────────────────────────────────────────
let auth = null;

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  onAuthStateChanged(auth, (user) => {
    if (user) showDashboard(user);
    else showLogin();
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(loginError);
    const email = $('email').value.trim();
    const password = $('password').value;
    const btn = $('login-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      showError(loginError, friendlyAuthError(err));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });

  $('logout-btn').addEventListener('click', () => signOut(auth));
} else {
  // No real config yet — let the admin see the UI but explain what's missing.
  show(configWarning);
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showError(loginError, 'Firebase is not configured yet. Add your config in admin/firebase-config.js.');
  });
}

function showLogin() {
  show(loginView);
  hide(appView);
}

function showDashboard(user) {
  hide(loginView);
  show(appView);
  $('user-email').textContent = user.email || '';
  $('greeting-title').textContent = `Namaste, ${niceName(user)} 🙏`;
}

function niceName(user) {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return 'friend';
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Incorrect email or password.';
  if (code.includes('invalid-email')) return 'That email address looks invalid.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait a moment and try again.';
  return err?.message || 'Sign-in failed.';
}

// ── Upload / process flow ────────────────────────────────────────
let fileContent = '';
let fileKind = '';       // 'txt' | 'json'
let resultData = null;   // the bhajan JSON to save

const titleEl = $('title');
const idEl = $('bhajan-id');
const displayTitleEl = $('display-title');
const langEl = $('language');
const dropzone = $('dropzone');
const fileInput = $('file-input');
const fileNameEl = $('file-name');
const processBtn = $('process-btn');

// Auto-slugify title -> id (until the user edits id manually)
let idEdited = false;
idEl.addEventListener('input', () => { idEdited = true; });
titleEl.addEventListener('input', () => {
  if (!idEdited) idEl.value = slugify(titleEl.value);
  if (!displayEdited) displayTitleEl.value = titleCase(idEl.value);
  refreshProcessBtn();
});
// Auto-fill the app display name from the id (until edited manually)
let displayEdited = false;
displayTitleEl.addEventListener('input', () => { displayEdited = true; });
langEl.addEventListener('change', updateLiveExample);
idEl.addEventListener('input', () => {
  if (!displayEdited) displayTitleEl.value = titleCase(idEl.value);
  refreshProcessBtn();
});

function titleCase(slug) {
  return String(slug).split('-').filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function updateLiveExample() {
  const lang = langEl.value;
  const ext = fileKind || 'txt';
  const el = document.querySelector('.live-example');
  if (el) el.textContent = `${lang}.${ext}`;
}

// Dropzone wiring
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.txt') && !name.endsWith('.json')) {
    fileNameEl.textContent = '⚠ Please choose a .txt or .json file.';
    show(fileNameEl);
    return;
  }
  fileKind = name.endsWith('.json') ? 'json' : 'txt';
  fileContent = await file.text();
  fileNameEl.textContent = `📄 ${file.name} (${fileKind.toUpperCase()}, ${fileContent.length} chars)`;
  show(fileNameEl);

  // If the filename hints at a language, preselect it (e.g. hindi.txt)
  const base = name.replace(/\.(txt|json)$/, '');
  const match = [...langEl.options].find((o) => o.value === base);
  if (match) langEl.value = base;

  updateLiveExample();
  refreshProcessBtn();
}

function refreshProcessBtn() {
  const ready = fileContent && titleEl.value.trim() && idEl.value.trim();
  processBtn.disabled = !ready;
}

// ── Call Gemini ──────────────────────────────────────────────────
processBtn.addEventListener('click', async () => {
  const id = idEl.value.trim();
  const title = titleEl.value.trim();
  const lang = langEl.value;
  const mode = fileKind === 'json' ? 'validate' : 'convert';

  toggleSpinner(true);
  processBtn.disabled = true;
  hideResult();

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, text: fileContent, id, title, lang }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
    renderResult(payload, mode);
  } catch (err) {
    renderError(err.message);
  } finally {
    toggleSpinner(false);
    refreshProcessBtn();
  }
});

function renderResult(payload, mode) {
  const summary = $('validation-summary');
  if (mode === 'validate') {
    const { valid, errors, data } = payload.result;
    resultData = data;
    if (valid && (!errors || errors.length === 0)) {
      summary.className = 'validation valid';
      summary.innerHTML = '<strong>✓ Valid</strong> — this JSON matches the schema.';
    } else {
      summary.className = 'validation invalid';
      summary.innerHTML =
        '<strong>⚠ Issues found</strong> — corrected version shown below.' +
        (errors?.length ? '<ul>' + errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('') + '</ul>' : '');
    }
  } else {
    resultData = payload.result;
    summary.className = 'validation valid';
    summary.innerHTML = '<strong>✓ Formatted</strong> — review the JSON, then save.';
  }
  $('result-json').textContent = JSON.stringify(resultData, null, 2);
  hide($('result-empty'));
  show($('result-panel'));
  show($('save-btn'));   // restore in case a previous attempt errored and hid it
  hide($('save-status'));
}

function renderError(msg) {
  const summary = $('validation-summary');
  summary.className = 'validation invalid';
  summary.innerHTML = `<strong>Error</strong> — ${escapeHtml(msg)}`;
  resultData = null;
  $('result-json').textContent = '';
  hide($('result-empty'));
  show($('result-panel'));
  hide($('save-btn'));
}

// ── Save / download / copy ───────────────────────────────────────
$('save-btn').addEventListener('click', async () => {
  if (!resultData) return;
  const id = idEl.value.trim();
  const lang = langEl.value;
  const langLabel = langEl.selectedOptions[0]?.dataset.label || lang;
  const displayTitle = displayTitleEl.value.trim();
  const status = $('save-status');
  status.className = 'save-status warn';
  status.textContent = 'Saving…';
  show(status);

  try {
    // Attach the Firebase login token so the live save function can authorise.
    const headers = { 'Content-Type': 'application/json' };
    if (auth && auth.currentUser) {
      headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    }

    const res = await fetch('/api/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id, lang, langLabel, displayTitle, data: resultData }),
    });
    const payload = await res.json().catch(() => ({}));

    if (res.ok) {
      status.className = 'save-status ok';
      const catalogNote = payload.created
        ? ' Added to the catalog as a new bhajan.'
        : payload.languageAdded
          ? ` Added ${escapeHtml(langLabel)} to its catalog entry.`
          : ' Catalog already had this language.';
      if (payload.committed) {
        status.innerHTML =
          `✓ Saved <code>${escapeHtml(payload.path)}</code> to the repo.` + catalogNote +
          ' Netlify will redeploy — it goes live in ~1–2 min.' +
          (payload.commitUrl ? ` <a href="${payload.commitUrl}" target="_blank" rel="noopener">View commit ↗</a>` : '');
      } else {
        status.innerHTML = `✓ Saved to <code>${escapeHtml(payload.path)}</code>.` + catalogNote;
      }
      return;
    }

    if (res.status === 401) {
      // Auth problem — don't silently download; tell them to sign in.
      status.className = 'save-status err';
      status.textContent = payload.error || 'Not signed in. Please log in again and retry.';
      return;
    }
    throw new Error(payload.error || `status ${res.status}`);
  } catch (err) {
    // Save unavailable/failed — fall back to a download so no work is lost.
    status.className = 'save-status warn';
    status.innerHTML =
      `Couldn't save automatically (${escapeHtml(err.message)}). ` +
      'Downloading the file instead — commit it to <code>data/bhajans/'
      + escapeHtml(id) + '/' + escapeHtml(lang) + '.json</code>.';
    downloadJson();
  }
});

$('download-btn').addEventListener('click', downloadJson);
$('copy-btn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(JSON.stringify(resultData, null, 2));
  const b = $('copy-btn');
  const prev = b.textContent;
  b.textContent = 'Copied ✓';
  setTimeout(() => (b.textContent = prev), 1500);
});

function downloadJson() {
  if (!resultData) return;
  const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${langEl.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Small helpers ────────────────────────────────────────────────
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function showError(el, msg) { el.textContent = msg; show(el); }
function hideResult() { hide($('result-panel')); show($('result-empty')); }
function toggleSpinner(on) { on ? show($('process-spinner')) : hide($('process-spinner')); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
