// Shared Gemini logic used by both the Netlify function and the local dev server.
// Converts raw bhajan lyric text into the app's JSON schema, and validates
// existing JSON against that schema. The API key never reaches the browser.

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// The lyrics JSON schema, expressed as a Gemini responseSchema so the model is
// forced to return structured output that matches PROJECT_CONTEXT.md.
const bhajanSchema = {
  type: 'OBJECT',
  properties: {
    id: { type: 'STRING' },
    title: { type: 'STRING' },
    lyrics: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },      // verse | doha | dhyanam | chaupai
          number: { type: 'INTEGER' },   // only on verse / chaupai
          lines: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['type', 'lines'],
      },
    },
  },
  required: ['id', 'title', 'lyrics'],
};

const validationSchema = {
  type: 'OBJECT',
  properties: {
    valid: { type: 'BOOLEAN' },
    errors: { type: 'ARRAY', items: { type: 'STRING' } },
    data: bhajanSchema,
  },
  required: ['valid', 'errors', 'data'],
};

function convertPrompt({ id, title, lang, text }) {
  return `You are helping the Sanatan Hindu Cultural Society (a Hindu community mandir) format devotional bhajan lyrics into a strict JSON schema for their app.

Bhajan id: "${id}"
Title (keep in the target language's script): "${title}"
Language: ${lang}

Rules:
- Preserve the ORIGINAL script and text EXACTLY (Devanagari, Gujarati, Tamil, Kannada, Telugu, Malayalam, Latin, etc.). Do NOT transliterate, translate, or "correct" the words.
- Group the lines into stanzas. Each stanza is an object with "type" and "lines".
- "type" is one of: "verse", "doha", "dhyanam", "chaupai".
    • "doha"   → couplets / dohās (2 lines, no number)
    • "chaupai"→ numbered quatrains (as in Hanuman Chalisa)
    • "dhyanam"→ meditation / invocation verses (no number)
    • "verse"  → anything else
- Only "verse" and "chaupai" stanzas may carry a "number" (their sequential order). NEVER put "number" on "doha" or "dhyanam".
- "lines" is an array of strings, one entry per line. Keep punctuation such as । and ॥.
- Set "id" to exactly "${id}" and "title" to exactly "${title}".
- Do not invent, merge, or drop any content.

Raw lyrics:
"""
${text}
"""`;
}

function validatePrompt({ id, text }) {
  return `You are validating a bhajan JSON file for the Sanatan Hindu Cultural Society app against this schema:
- Top-level object: "id" (string slug), "title" (non-empty string), "lyrics" (non-empty array).
- Each lyrics item: "type" ∈ {verse, doha, dhyanam, chaupai}, "lines" (array of non-empty strings), optional "number" (integer, ONLY on verse/chaupai).
${id ? `- The "id" should equal "${id}".` : ''}

Check the JSON below. Then return:
- "valid": true ONLY if it fully conforms and needs no changes.
- "errors": clear, human-readable descriptions of every problem (empty array if valid).
- "data": a corrected/normalised version that DOES conform. Fix structural issues (wrong keys, missing id, stray "number" on doha, empty lines) but NEVER alter the actual lyric text or its script.

JSON to validate:
"""
${text}
"""`;
}

async function callGemini({ prompt, schema, apiKey, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 500)}`);
  }

  const body = await res.json();
  const textOut = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOut) throw new Error('Gemini returned no content.');

  try {
    return JSON.parse(textOut);
  } catch {
    throw new Error('Gemini returned output that was not valid JSON.');
  }
}

/**
 * @param {object} opts
 * @param {'convert'|'validate'} opts.mode
 * @param {string} opts.text   raw lyrics (convert) or JSON string (validate)
 * @param {string} opts.id     target bhajan id (slug)
 * @param {string} opts.title  bhajan title in the target script
 * @param {string} opts.lang   language key (english, hindi, ...)
 * @param {string} opts.apiKey Gemini API key
 * @param {string} [opts.model]
 * @returns {Promise<{mode:string, result:object}>}
 */
async function runGemini({ mode, text, id, title, lang, apiKey, model }) {
  if (!apiKey) throw new Error('Gemini API key is not configured on the server.');
  if (!text || !text.trim()) throw new Error('No file content was provided.');

  const usedModel = model || DEFAULT_MODEL;

  if (mode === 'convert') {
    const result = await callGemini({
      prompt: convertPrompt({ id, title, lang, text }),
      schema: bhajanSchema,
      apiKey,
      model: usedModel,
    });
    return { mode, result };
  }

  if (mode === 'validate') {
    const result = await callGemini({
      prompt: validatePrompt({ id, text }),
      schema: validationSchema,
      apiKey,
      model: usedModel,
    });
    return { mode, result };
  }

  throw new Error(`Unknown mode: ${mode}`);
}

module.exports = { runGemini, DEFAULT_MODEL };
