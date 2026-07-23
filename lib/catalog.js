// Merge a saved bhajan/language into catalog.json.
// Shared by the live save function and the local dev server so both behave the
// same. The catalog `title` is the English display name shown in the app list;
// it is set when the bhajan is first created and left untouched on later
// language additions (edit catalog.json by hand if a title ever needs fixing).

/**
 * @param {Array} catalog  parsed catalog.json (array of bhajan entries)
 * @param {object} o
 * @param {string} o.id           bhajan slug
 * @param {string} [o.displayTitle] English display name (used only on create)
 * @param {string} o.langKey       language key, e.g. "hindi"
 * @param {string} [o.langLabel]   language label, e.g. "Hindi"
 * @returns {{catalog: Array, created: boolean, languageAdded: boolean}}
 */
function upsertCatalogEntry(catalog, { id, displayTitle, langKey, langLabel }) {
  if (!Array.isArray(catalog)) catalog = [];

  let entry = catalog.find((b) => b && b.id === id);
  let created = false;
  if (!entry) {
    entry = { id, title: (displayTitle && displayTitle.trim()) || id, languages: [] };
    catalog.push(entry);
    created = true;
  }
  if (!Array.isArray(entry.languages)) entry.languages = [];

  let languageAdded = false;
  if (langKey && !entry.languages.some((l) => l && l.key === langKey)) {
    entry.languages.push({ key: langKey, label: langLabel || langKey });
    languageAdded = true;
  }

  return { catalog, created, languageAdded };
}

module.exports = { upsertCatalogEntry };
