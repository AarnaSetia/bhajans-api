// Netlify serverless function — secure Gemini proxy.
// The GEMINI_API_KEY env var stays on the server; the browser only ever calls
// /api/gemini (redirected here in netlify.toml).

const { runGemini } = require('../../lib/gemini');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { mode, text, id, title, lang } = JSON.parse(event.body || '{}');
    const out = await runGemini({
      mode,
      text,
      id,
      title,
      lang,
      apiKey: process.env.GEMINI_API_KEY,
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(out),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
